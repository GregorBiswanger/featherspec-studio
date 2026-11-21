package com.gregorbiswanger.featherspec.studio.ports

import com.google.gson.JsonObject
import com.google.gson.JsonParser
import com.intellij.openapi.Disposable
import com.intellij.openapi.application.ApplicationActivationListener
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.diagnostic.thisLogger
import com.intellij.openapi.util.Disposer
import com.intellij.openapi.vfs.LocalFileSystem
import com.intellij.openapi.vfs.VfsUtil
import com.intellij.openapi.vfs.VirtualFileManager
import com.intellij.openapi.vfs.newvfs.BulkFileListener
import com.intellij.openapi.vfs.newvfs.events.VFileEvent
import com.intellij.openapi.wm.IdeFrame
import com.intellij.util.concurrency.AppExecutorUtil
import java.nio.file.Path
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicBoolean

class SpecWatch(
    private val dispatch: (String, String) -> Unit,
    parent: Disposable,
    private val caseInsensitive: Boolean = HostOs.caseInsensitive,
) {
    private class Entry(val uri: String, val path: Path, val text: String)

    private val registry = WatchRegistry()
    private val entries = ConcurrentHashMap<String, Entry>()
    private val byPath = ConcurrentHashMap<Path, Entry>()
    private val refreshQueue = ConcurrentHashMap.newKeySet<Path>()
    private val refreshScheduled = AtomicBoolean(false)
    private val closed = AtomicBoolean(false)
    private val watcher = RootWatcher { root, relative -> onWatcher(root, relative) }

    private val changes = object : BulkFileListener {
        override fun after(events: List<VFileEvent>) {
            if (closed.get() || entries.isEmpty()) {
                return
            }
            val seen = HashSet<String>()
            for (event in events) {
                val path = event.path
                for (entry in entries.values) {
                    val relative = WatchedPaths.relativeInside(entry.text, path, caseInsensitive) ?: continue
                    if (relative.isNotEmpty() && seen.add(entry.uri + "\n" + relative)) {
                        route(entry, relative)
                    }
                }
            }
        }
    }

    private val activation = object : ApplicationActivationListener {
        override fun applicationActivated(ideFrame: IdeFrame) {
            if (!closed.get() && entries.isNotEmpty()) {
                AppExecutorUtil.getAppExecutorService().execute { refreshSpecs() }
            }
        }
    }

    init {
        val connection = ApplicationManager.getApplication().messageBus.connect(parent)
        connection.subscribe(VirtualFileManager.VFS_CHANGES, changes)
        connection.subscribe(ApplicationActivationListener.TOPIC, activation)
        Disposer.register(parent, Disposable { close() })
    }

    fun answer(name: String, argsJson: String): String? {
        if (name != "watch.add" && name != "watch.remove") {
            return null
        }
        return try {
            val args = JsonParser.parseString(argsJson).asJsonObject
            val root = args.get("root").asString
            val kind = args.get("kind").asString
            require(kind == KIND_FILES || kind == KIND_MARKERS) { "Unknown watch kind: $kind" }
            if (name == "watch.add") add(root, kind) else remove(root, kind)
            OK_NULL
        } catch (failure: RuntimeException) {
            JsonObject().apply { addProperty("error", failure.message ?: failure.javaClass.simpleName) }.toString()
        }
    }

    fun add(root: String, kind: String) {
        if (closed.get() || !registry.add(root, kind)) {
            return
        }
        val path = FileUris.toPath(root).toAbsolutePath().normalize()
        val entry = Entry(root, path, FileUris.toPathText(root).replace('\\', '/'))
        entries[root] = entry
        byPath[path] = entry
        watcher.watch(path)
    }

    fun remove(root: String, kind: String) {
        if (!registry.remove(root, kind)) {
            return
        }
        val entry = entries.remove(root) ?: return
        byPath.remove(entry.path)
        watcher.unwatch(entry.path)
    }

    fun close() {
        if (!closed.compareAndSet(false, true)) {
            return
        }
        watcher.close()
        entries.clear()
        byPath.clear()
        refreshQueue.clear()
    }

    private fun onWatcher(root: Path, relative: String) {
        val entry = byPath[root] ?: return
        route(entry, relative)
        queueRefresh(root.resolve(relative))
    }

    private fun route(entry: Entry, relative: String) {
        val everything = relative.isEmpty()
        try {
            if ((everything || WatchedPaths.isReported(relative)) && registry.has(entry.uri, KIND_FILES)) {
                dispatch("fileChanged", ChangeEvents.fileChanged(entry.uri, relative))
            }
            if ((everything || WatchedPaths.isMarker(relative)) && registry.has(entry.uri, KIND_MARKERS)) {
                dispatch("markerChanged", ChangeEvents.markerChanged(entry.uri))
            }
        } catch (failure: RuntimeException) {
            thisLogger().warn("A FeatherSpec file change could not be forwarded", failure)
        }
    }

    private fun queueRefresh(path: Path) {
        refreshQueue.add(path)
        if (refreshScheduled.compareAndSet(false, true)) {
            AppExecutorUtil.getAppExecutorService().execute { flushRefresh() }
        }
    }

    private fun flushRefresh() {
        refreshScheduled.set(false)
        val paths = ArrayList<Path>()
        val iterator = refreshQueue.iterator()
        while (iterator.hasNext()) {
            paths.add(iterator.next())
            iterator.remove()
        }
        for (path in paths) {
            refreshNearest(path)
        }
    }

    private fun refreshNearest(path: Path) {
        val fileSystem = LocalFileSystem.getInstance()
        var candidate: Path? = path
        while (candidate != null) {
            val file = fileSystem.refreshAndFindFileByPath(slash(candidate))
            if (file != null) {
                VfsUtil.markDirtyAndRefresh(true, false, candidate != path, file)
                return
            }
            candidate = candidate.parent
        }
    }

    private fun refreshSpecs() {
        val fileSystem = LocalFileSystem.getInstance()
        for (entry in entries.values) {
            val specs = fileSystem.refreshAndFindFileByPath(slash(entry.path.resolve(WatchedPaths.SPECS)))
            if (specs != null) {
                VfsUtil.markDirtyAndRefresh(true, true, true, specs)
                continue
            }
            val root = fileSystem.refreshAndFindFileByPath(slash(entry.path))
            if (root != null) {
                VfsUtil.markDirtyAndRefresh(true, false, true, root)
            }
        }
    }

    private fun slash(path: Path): String = path.toString().replace('\\', '/')

    private companion object {
        const val KIND_FILES = "files"
        const val KIND_MARKERS = "markers"
        const val OK_NULL = "{\"ok\":null}"
    }
}
