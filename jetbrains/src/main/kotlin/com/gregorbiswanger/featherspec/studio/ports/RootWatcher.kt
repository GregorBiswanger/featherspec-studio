package com.gregorbiswanger.featherspec.studio.ports

import com.google.gson.JsonObject
import com.sun.nio.file.SensitivityWatchEventModifier
import java.io.IOException
import java.nio.file.ClosedWatchServiceException
import java.nio.file.FileSystems
import java.nio.file.FileVisitResult
import java.nio.file.Files
import java.nio.file.LinkOption
import java.nio.file.Path
import java.nio.file.SimpleFileVisitor
import java.nio.file.StandardWatchEventKinds.ENTRY_CREATE
import java.nio.file.StandardWatchEventKinds.ENTRY_DELETE
import java.nio.file.StandardWatchEventKinds.ENTRY_MODIFY
import java.nio.file.StandardWatchEventKinds.OVERFLOW
import java.nio.file.WatchEvent
import java.nio.file.WatchKey
import java.nio.file.WatchService
import java.nio.file.attribute.BasicFileAttributes
import java.util.concurrent.atomic.AtomicBoolean

object WatchedPaths {
    const val AGENTS = "AGENTS.md"
    const val SPECS = ".specs"
    const val MEMORY_BANK = ".memory-bank"
    const val BRIEF = ".memory-bank/projectbrief.md"

    private val RETURN_NOTE = Regex("^\\.memory-bank/activeContext\\.[^/]+\\.md$")

    fun isReported(relative: String): Boolean =
        relative == AGENTS ||
            relative == SPECS ||
            relative.startsWith("$SPECS/") ||
            relative == BRIEF ||
            RETURN_NOTE.matches(relative)

    fun isMarker(relative: String): Boolean = relative == AGENTS || relative == SPECS || relative == BRIEF

    fun isWatchedDirectory(relative: String): Boolean =
        relative == SPECS ||
            relative.startsWith("$SPECS/") ||
            relative == MEMORY_BANK ||
            relative.startsWith("$MEMORY_BANK/")

    fun relativeInside(root: String, path: String, caseInsensitive: Boolean): String? {
        val base = root.replace('\\', '/').trimEnd('/')
        val target = path.replace('\\', '/')
        val prefix = "$base/"
        if (fold(target, caseInsensitive) == fold(base, caseInsensitive)) {
            return ""
        }
        if (!fold(target, caseInsensitive).startsWith(fold(prefix, caseInsensitive))) {
            return null
        }
        return target.substring(prefix.length)
    }

    private fun fold(text: String, caseInsensitive: Boolean): String = if (caseInsensitive) text.lowercase() else text
}

class WatchRegistry {
    private val counts = HashMap<String, HashMap<String, Int>>()

    @Synchronized
    fun add(root: String, kind: String): Boolean {
        val kinds = counts.getOrPut(root) { HashMap() }
        val first = kinds.isEmpty()
        kinds[kind] = (kinds[kind] ?: 0) + 1
        return first
    }

    @Synchronized
    fun remove(root: String, kind: String): Boolean {
        val kinds = counts[root] ?: return false
        val current = kinds[kind] ?: return false
        if (current <= 1) {
            kinds.remove(kind)
        } else {
            kinds[kind] = current - 1
        }
        if (kinds.isEmpty()) {
            counts.remove(root)
            return true
        }
        return false
    }

    @Synchronized
    fun has(root: String, kind: String): Boolean = (counts[root]?.get(kind) ?: 0) > 0

    @Synchronized
    fun roots(): List<String> = counts.keys.toList()
}

object ChangeEvents {
    fun fileChanged(root: String, path: String): String = JsonObject().apply {
        addProperty("root", root)
        addProperty("path", path)
    }.toString()

    fun markerChanged(root: String): String = JsonObject().apply {
        addProperty("root", root)
    }.toString()
}

class RootWatcher(private val onChange: (root: Path, relative: String) -> Unit) : AutoCloseable {
    private class Registration(val root: Path, val directory: Path)

    private val service: WatchService = FileSystems.getDefault().newWatchService()
    private val lock = Any()
    private val registrations = HashMap<WatchKey, Registration>()
    private val roots = HashSet<Path>()
    private val closed = AtomicBoolean(false)
    private val thread = Thread({ pump() }, THREAD_NAME).apply { isDaemon = true }

    init {
        thread.start()
    }

    fun isRunning(): Boolean = thread.isAlive

    fun watch(root: Path) {
        val normal = root.toAbsolutePath().normalize()
        synchronized(lock) {
            if (closed.get() || !roots.add(normal)) {
                return
            }
        }
        registerDirectory(normal, normal)
        for (name in WATCHED_ROOT_DIRECTORIES) {
            val directory = normal.resolve(name)
            if (Files.isDirectory(directory, LinkOption.NOFOLLOW_LINKS)) {
                registerTree(normal, directory, false)
            }
        }
    }

    fun unwatch(root: Path) {
        val normal = root.toAbsolutePath().normalize()
        synchronized(lock) {
            if (!roots.remove(normal)) {
                return
            }
            val iterator = registrations.entries.iterator()
            while (iterator.hasNext()) {
                val entry = iterator.next()
                if (entry.value.root == normal) {
                    entry.key.cancel()
                    iterator.remove()
                }
            }
        }
    }

    override fun close() {
        if (!closed.compareAndSet(false, true)) {
            return
        }
        try {
            service.close()
        } catch (failure: IOException) {
            return
        }
        if (Thread.currentThread() !== thread) {
            thread.join(JOIN_TIMEOUT_MS)
        }
    }

    private fun pump() {
        while (!closed.get()) {
            val key = try {
                service.take()
            } catch (failure: ClosedWatchServiceException) {
                return
            } catch (failure: InterruptedException) {
                return
            }
            val registration = synchronized(lock) { registrations[key] }
            val events = key.pollEvents()
            if (registration != null) {
                handle(registration, events)
            }
            if (!key.reset()) {
                synchronized(lock) { registrations.remove(key) }
            }
        }
    }

    private fun handle(registration: Registration, events: List<WatchEvent<*>>) {
        val root = registration.root
        for (event in events) {
            val kind = event.kind()
            if (kind == OVERFLOW) {
                report(root, "")
                continue
            }
            val name = event.context() as? Path ?: continue
            val child = registration.directory.resolve(name)
            val relative = relativeOf(root, child)
            val created = kind == ENTRY_CREATE &&
                WatchedPaths.isWatchedDirectory(relative) &&
                Files.isDirectory(child, LinkOption.NOFOLLOW_LINKS)
            if (created) {
                registerTree(root, child, true)
            } else if (WatchedPaths.isReported(relative)) {
                report(root, relative)
            }
        }
    }

    private fun registerTree(root: Path, start: Path, reportEntries: Boolean) {
        try {
            Files.walkFileTree(start, object : SimpleFileVisitor<Path>() {
                override fun preVisitDirectory(dir: Path, attrs: BasicFileAttributes): FileVisitResult {
                    registerDirectory(root, dir)
                    if (reportEntries) {
                        reportIfWatched(root, dir)
                    }
                    return FileVisitResult.CONTINUE
                }

                override fun visitFile(file: Path, attrs: BasicFileAttributes): FileVisitResult {
                    if (reportEntries) {
                        reportIfWatched(root, file)
                    }
                    return FileVisitResult.CONTINUE
                }

                override fun visitFileFailed(file: Path, exc: IOException): FileVisitResult = FileVisitResult.CONTINUE
            })
        } catch (failure: IOException) {
            return
        }
    }

    private fun registerDirectory(root: Path, directory: Path) {
        synchronized(lock) {
            if (closed.get()) {
                return
            }
            try {
                registrations[register(directory)] = Registration(root, directory)
            } catch (failure: IOException) {
                return
            } catch (failure: ClosedWatchServiceException) {
                return
            }
        }
    }

    private fun register(directory: Path): WatchKey {
        if (!HostOs.mac) {
            return directory.register(service, ENTRY_CREATE, ENTRY_MODIFY, ENTRY_DELETE)
        }
        val kinds = arrayOf<WatchEvent.Kind<*>>(ENTRY_CREATE, ENTRY_MODIFY, ENTRY_DELETE)
        return try {
            directory.register(service, kinds, SensitivityWatchEventModifier.HIGH)
        } catch (failure: UnsupportedOperationException) {
            directory.register(service, ENTRY_CREATE, ENTRY_MODIFY, ENTRY_DELETE)
        }
    }

    private fun reportIfWatched(root: Path, path: Path) {
        val relative = relativeOf(root, path)
        if (WatchedPaths.isReported(relative)) {
            report(root, relative)
        }
    }

    private fun report(root: Path, relative: String) {
        val active = synchronized(lock) { roots.contains(root) }
        if (!active) {
            return
        }
        try {
            onChange(root, relative)
        } catch (failure: RuntimeException) {
            return
        }
    }

    private fun relativeOf(root: Path, path: Path): String = root.relativize(path).joinToString("/")

    private companion object {
        const val THREAD_NAME = "FeatherSpec watcher"
        const val JOIN_TIMEOUT_MS = 5_000L
        val WATCHED_ROOT_DIRECTORIES = listOf(WatchedPaths.SPECS, WatchedPaths.MEMORY_BANK)
    }
}
