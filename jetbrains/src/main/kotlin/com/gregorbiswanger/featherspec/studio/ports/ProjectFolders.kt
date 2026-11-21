package com.gregorbiswanger.featherspec.studio.ports

import com.google.gson.JsonObject

data class Folder(val root: String, val name: String, val displayPath: String) {
    fun toJson(): JsonObject = JsonObject().apply {
        addProperty("root", root)
        addProperty("name", name)
        addProperty("displayPath", displayPath)
    }
}

object ProjectFolders {
    fun folders(basePath: String?, contentRoots: List<String>, windows: Boolean = HostOs.windows): List<Folder> {
        val base = basePath?.let { normalize(it) }?.takeIf { it.isNotEmpty() }
        val accepted = ArrayList<String>()
        if (base != null) {
            accepted.add(base)
        }
        for (candidate in contentRoots.map { normalize(it) }.filter { it.isNotEmpty() }) {
            val insideBase = base != null && sameOrInside(base, candidate, windows)
            if (!insideBase && accepted.none { same(it, candidate, windows) }) {
                accepted.add(candidate)
            }
        }
        return accepted.map { folderOf(it, windows) }
    }

    private fun folderOf(path: String, windows: Boolean): Folder {
        val last = path.substringAfterLast('/')
        return Folder(
            root = FileUris.fromText(path, windows),
            name = last.ifEmpty { path },
            displayPath = if (windows) path.replace('/', '\\') else path,
        )
    }

    private fun normalize(path: String): String {
        var text = path.trim().replace('\\', '/')
        while (text.length > 1 && text.endsWith("/") && !(text.length == 3 && text[1] == ':')) {
            text = text.substring(0, text.length - 1)
        }
        return text
    }

    private fun fold(text: String, windows: Boolean): String = if (windows) text.lowercase() else text

    private fun same(first: String, second: String, windows: Boolean): Boolean =
        fold(first, windows) == fold(second, windows)

    private fun sameOrInside(base: String, candidate: String, windows: Boolean): Boolean {
        val folded = fold(candidate, windows)
        val root = fold(base, windows)
        return folded == root || folded.startsWith(if (root.endsWith("/")) root else "$root/")
    }
}
