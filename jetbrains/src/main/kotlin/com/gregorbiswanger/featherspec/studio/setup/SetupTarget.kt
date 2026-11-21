package com.gregorbiswanger.featherspec.studio.setup

import com.gregorbiswanger.featherspec.studio.ports.FileUris
import java.io.IOException
import java.nio.file.AccessDeniedException
import java.nio.file.AtomicMoveNotSupportedException
import java.nio.file.DirectoryNotEmptyException
import java.nio.file.FileAlreadyExistsException
import java.nio.file.FileSystemException
import java.nio.file.FileVisitResult
import java.nio.file.Files
import java.nio.file.LinkOption
import java.nio.file.NoSuchFileException
import java.nio.file.NotDirectoryException
import java.nio.file.Path
import java.nio.file.SimpleFileVisitor
import java.nio.file.StandardCopyOption
import java.nio.file.StandardOpenOption
import java.nio.file.attribute.BasicFileAttributes
import java.nio.file.attribute.PosixFilePermission
import java.util.concurrent.atomic.AtomicLong

class SetupTarget(
    private val rootOf: (String) -> Path = { FileUris.toPath(it) },
    private val move: (Path, Path) -> Unit = { from, to -> SetupTarget.moveOver(from, to) },
    private val retryDelayMs: Long = RETRY_DELAY_MS,
) {
    fun kind(root: String, relativePath: String): String? {
        val path = locate(root, relativePath)
        try {
            val attributes = Files.readAttributes(path, BasicFileAttributes::class.java)
            return when {
                attributes.isRegularFile -> "file"
                attributes.isDirectory -> "directory"
                else -> "other"
            }
        } catch (failure: IOException) {
            if (!isAbsent(failure)) {
                throw reasoned(failure)
            }
        }
        try {
            Files.readAttributes(path, BasicFileAttributes::class.java, LinkOption.NOFOLLOW_LINKS)
            return "other"
        } catch (failure: IOException) {
            if (isAbsent(failure)) {
                return null
            }
            throw reasoned(failure)
        }
    }

    fun readBytes(root: String, relativePath: String): ByteArray {
        val path = locate(root, relativePath)
        try {
            return Files.readAllBytes(path)
        } catch (failure: IOException) {
            throw reasoned(failure)
        }
    }

    fun listDirectory(root: String, relativePath: String): List<String>? {
        val path = locate(root, relativePath)
        try {
            return Files.newDirectoryStream(path).use { stream -> stream.map { it.fileName.toString() } }
        } catch (failure: IOException) {
            if (isAbsent(failure)) {
                return null
            }
            throw reasoned(failure)
        }
    }

    fun createExclusive(root: String, relativePath: String, bytes: ByteArray): String {
        val path = locate(root, relativePath)
        try {
            path.parent?.let { Files.createDirectories(it) }
        } catch (failure: IOException) {
            throw reasoned(failure)
        }
        try {
            Files.newOutputStream(path, StandardOpenOption.CREATE_NEW, StandardOpenOption.WRITE).use { it.write(bytes) }
        } catch (failure: FileAlreadyExistsException) {
            return "exists"
        } catch (failure: IOException) {
            deleteQuietly(path)
            throw reasoned(failure)
        }
        return "created"
    }

    fun replaceIfUnchanged(root: String, relativePath: String, expected: ByteArray, next: ByteArray): String {
        val current = readReal(locate(root, relativePath)) ?: return "changed"
        if (!current.second.contentEquals(expected)) {
            return "changed"
        }
        val real = current.first
        val permissions = permissionsOf(real)
        val temporary = real.resolveSibling("${real.fileName}.featherspec-${ProcessHandle.current().pid()}-${COUNTER.incrementAndGet()}.tmp")
        try {
            Files.newOutputStream(temporary, StandardOpenOption.CREATE_NEW, StandardOpenOption.WRITE).use { it.write(next) }
        } catch (failure: FileAlreadyExistsException) {
            throw IOException("a temporary file of this name exists")
        } catch (failure: IOException) {
            deleteQuietly(temporary)
            throw reasoned(failure)
        }
        if (permissions != null) {
            try {
                Files.setPosixFilePermissions(temporary, permissions)
            } catch (ignored: Exception) {
            }
        }
        var attempt = 1
        while (true) {
            try {
                move(temporary, real)
                return "replaced"
            } catch (failure: IOException) {
                if (!busy(failure) || attempt >= RENAME_TRIES) {
                    deleteQuietly(temporary)
                    throw reasoned(failure)
                }
                attempt++
                Thread.sleep(retryDelayMs)
            }
        }
    }

    fun clearSetupFolder(root: String) {
        val folder = locate(root, SETUP_FOLDER)
        val attributes = try {
            Files.readAttributes(folder, BasicFileAttributes::class.java, LinkOption.NOFOLLOW_LINKS)
        } catch (failure: IOException) {
            if (isAbsent(failure)) {
                return
            }
            throw reasoned(failure)
        }
        if (!attributes.isDirectory) {
            return
        }
        var attempt = 1
        while (true) {
            try {
                deleteTree(folder)
                return
            } catch (failure: IOException) {
                if (isAbsent(failure)) {
                    return
                }
                if (attempt >= RENAME_TRIES) {
                    throw reasoned(failure)
                }
                attempt++
                Thread.sleep(retryDelayMs)
            }
        }
    }

    private fun readReal(requested: Path): Pair<Path, ByteArray>? {
        try {
            val real = requested.toRealPath()
            return real to Files.readAllBytes(real)
        } catch (failure: IOException) {
            if (isAbsent(failure)) {
                return null
            }
            throw reasoned(failure)
        }
    }

    private fun permissionsOf(path: Path): Set<PosixFilePermission>? = try {
        Files.getPosixFilePermissions(path)
    } catch (failure: UnsupportedOperationException) {
        null
    } catch (failure: IOException) {
        null
    }

    private fun deleteTree(folder: Path) {
        Files.walkFileTree(folder, object : SimpleFileVisitor<Path>() {
            override fun visitFile(file: Path, attributes: BasicFileAttributes): FileVisitResult {
                Files.delete(file)
                return FileVisitResult.CONTINUE
            }

            override fun postVisitDirectory(directory: Path, failure: IOException?): FileVisitResult {
                if (failure != null) {
                    throw failure
                }
                Files.delete(directory)
                return FileVisitResult.CONTINUE
            }
        })
    }

    private fun deleteQuietly(path: Path) {
        try {
            Files.deleteIfExists(path)
        } catch (ignored: IOException) {
        }
    }

    private fun locate(root: String, relativePath: String): Path {
        val base = rootOf(root)
        var path = base
        for (part in relativePath.split('/')) {
            if (part.isEmpty() || part == ".") {
                continue
            }
            require(part != "..") { "Path escapes the root: $relativePath" }
            path = path.resolve(part)
        }
        require(path.startsWith(base)) { "Path escapes the root: $relativePath" }
        return path
    }

    private fun isAbsent(failure: IOException): Boolean =
        failure is NoSuchFileException ||
            failure is NotDirectoryException ||
            (failure is FileSystemException && failure.reason?.contains("Not a directory", ignoreCase = true) == true)

    private fun busy(failure: IOException): Boolean =
        failure is AccessDeniedException || failure.javaClass == FileSystemException::class.java

    private fun reasoned(failure: IOException): IOException = IOException(reasonOf(failure))

    private fun reasonOf(failure: IOException): String = when (failure) {
        is NoSuchFileException -> "no such file or directory"
        is AccessDeniedException -> "permission denied"
        is FileAlreadyExistsException -> "file already exists"
        is DirectoryNotEmptyException -> "directory not empty"
        is NotDirectoryException -> "not a directory"
        is FileSystemException -> failure.reason ?: failure.javaClass.simpleName
        else -> failure.message ?: failure.javaClass.simpleName
    }

    companion object {
        const val SETUP_FOLDER = ".featherspec-setup"
        private const val RENAME_TRIES = 5
        private const val RETRY_DELAY_MS = 100L
        private val COUNTER = AtomicLong()

        fun moveOver(from: Path, to: Path) {
            try {
                Files.move(from, to, StandardCopyOption.ATOMIC_MOVE)
            } catch (failure: AtomicMoveNotSupportedException) {
                Files.move(from, to, StandardCopyOption.REPLACE_EXISTING)
            }
        }
    }
}
