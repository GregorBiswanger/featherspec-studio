package com.gregorbiswanger.featherspec.studio.probe

import com.google.gson.JsonObject
import com.google.gson.JsonParser
import java.nio.file.Files
import java.nio.file.Path

data class ShellFacts(val area: String, val selection: String)

object PanelFrames {
    fun type(json: String): String = text(parse(json), "type")

    fun shell(json: String): ShellFacts? {
        val root = parse(json) ?: return null
        if (text(root, "type") != "shell") {
            return null
        }
        val view = root.get("payload")?.takeIf { it.isJsonObject }?.asJsonObject?.get("view")?.takeIf { it.isJsonObject }?.asJsonObject
            ?: return null
        val selection = view.get("selection")?.takeIf { it.isJsonObject }?.asJsonObject
        return ShellFacts(text(view, "area"), if (selection == null) "" else text(selection, "stem"))
    }

    private fun parse(json: String): JsonObject? = try {
        JsonParser.parseString(json).takeIf { it.isJsonObject }?.asJsonObject
    } catch (failure: RuntimeException) {
        null
    }

    private fun text(root: JsonObject?, name: String): String =
        root?.get(name)?.takeIf { it.isJsonPrimitive }?.asString.orEmpty()
}

data class ThemeObservation(val bodyClass: String, val variables: Map<String, String>) {
    fun missing(names: Collection<String>): List<String> = names.filter { it !in variables }.sorted()

    fun complete(names: Collection<String>): Boolean = bodyClass.isNotEmpty() && missing(names).isEmpty()
}

object ThemeScriptReader {
    private const val LITERAL = """"(?:[^"\\]|\\.)*""""
    private val PROPERTY = Regex("""root\.setProperty\(($LITERAL), ($LITERAL)\);""")
    private val BODY = Regex("""document\.body\.className = ($LITERAL);""")

    fun read(script: String): ThemeObservation {
        val variables = LinkedHashMap<String, String>()
        PROPERTY.findAll(script).forEach { variables[unquote(it.groupValues[1])] = unquote(it.groupValues[2]) }
        val body = BODY.find(script)?.let { unquote(it.groupValues[1]) }.orEmpty()
        return ThemeObservation(body, variables)
    }

    fun unquote(literal: String): String {
        val inner = literal.substring(1, literal.length - 1)
        val out = StringBuilder(inner.length)
        var index = 0
        while (index < inner.length) {
            val char = inner[index]
            if (char != '\\' || index + 1 >= inner.length) {
                out.append(char)
                index += 1
                continue
            }
            val next = inner[index + 1]
            when (next) {
                'n' -> out.append('\n')
                'r' -> out.append('\r')
                't' -> out.append('\t')
                'u' -> {
                    val code = if (index + 6 <= inner.length) inner.substring(index + 2, index + 6).toIntOrNull(16) else null
                    if (code == null) {
                        out.append("\\u")
                    } else {
                        out.append(code.toChar())
                        index += 4
                    }
                }
                else -> out.append(next)
            }
            index += 2
        }
        return out.toString()
    }
}

data class ThemeWant(val name: String, val bodyClass: String)

object SmokeThemes {
    val WANTED: List<ThemeWant> = listOf(
        ThemeWant("Light", "vscode-light"),
        ThemeWant("Darcula", "vscode-dark"),
        ThemeWant("High Contrast", "vscode-high-contrast"),
        ThemeWant("Islands Light", "vscode-light"),
        ThemeWant("Islands Dark", "vscode-dark"),
    )

    fun pick(names: List<String>, wanted: String): Int {
        val exact = names.indexOfFirst { it.equals(wanted, ignoreCase = true) }
        if (exact >= 0) {
            return exact
        }
        if (wanted.equals("High Contrast", ignoreCase = true)) {
            return names.withIndex().filter { it.value.contains("contrast", ignoreCase = true) }.minByOrNull { it.value.length }?.index ?: -1
        }
        return -1
    }

    fun order(current: String): List<ThemeWant> =
        if (WANTED.first().name.equals(current, ignoreCase = true)) WANTED.drop(1) + WANTED.first() else WANTED
}

data class FileChanges(val created: List<String>, val changed: List<String>, val deleted: List<String>)

object SmokeFiles {
    const val EXTERNAL = ".specs/backlog/0099-smoke-ext.md"
    const val EDITED = ".specs/active/0015-focus-on-visibility.md"
    const val EXTERNAL_TEXT = "# Smoke external spec\n\n**Status:** Draft\n**Plan:** _none yet_\n"
    const val TITLE_SUFFIX = " (smoke)"
    const val STATUS_RUNNING = "**Status:** In Progress"
    const val STATUS_PARKED = "**Status:** Draft"

    fun parkStatus(text: String): String = swap(text, STATUS_RUNNING, STATUS_PARKED)

    fun resumeStatus(text: String): String = swap(text, STATUS_PARKED, STATUS_RUNNING)

    private fun swap(text: String, from: String, to: String): String {
        require(text.contains(from)) { "the spec has no line '$from'" }
        return text.replaceFirst(from, to)
    }

    fun snapshot(root: Path): Map<String, String> {
        val result = LinkedHashMap<String, String>()
        Files.walk(root).use { paths ->
            paths.filter { Files.isRegularFile(it) }.forEach { file ->
                val relative = root.relativize(file).toString().replace('\\', '/')
                if (relative != ".idea" && !relative.startsWith(".idea/")) {
                    result[relative] = Files.getLastModifiedTime(file).toMillis().toString() + ":" + Files.size(file)
                }
            }
        }
        return result
    }

    fun diff(before: Map<String, String>, after: Map<String, String>): FileChanges =
        FileChanges(
            created = after.keys.filter { it !in before }.sorted(),
            changed = after.keys.filter { before[it] != null && before[it] != after[it] }.sorted(),
            deleted = before.keys.filter { it !in after }.sorted(),
        )

    fun appendToTitle(text: String): String {
        val lineEnd = text.indexOf('\n')
        if (lineEnd < 0) {
            return text + TITLE_SUFFIX
        }
        val cut = if (lineEnd > 0 && text[lineEnd - 1] == '\r') lineEnd - 1 else lineEnd
        return text.substring(0, cut) + TITLE_SUFFIX + text.substring(cut)
    }
}
