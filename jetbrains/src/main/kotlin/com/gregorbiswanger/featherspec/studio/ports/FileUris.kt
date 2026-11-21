package com.gregorbiswanger.featherspec.studio.ports

import java.io.ByteArrayOutputStream
import java.nio.charset.StandardCharsets
import java.nio.file.Path

object HostOs {
    private val name: String = System.getProperty("os.name").orEmpty().lowercase()

    val windows: Boolean = name.startsWith("windows")
    val mac: Boolean = name.startsWith("mac")
    val caseInsensitive: Boolean = windows || mac
}

object FileUris {
    private const val HEX = "0123456789ABCDEF"
    private const val SCHEME = "file://"

    fun toUri(path: Path, windows: Boolean): String = fromText(path.toString(), windows)

    fun toPath(uri: String): Path = Path.of(toPathText(uri))

    fun fromText(text: String, windows: Boolean): String {
        val unified = if (windows) text.replace('\\', '/') else text
        var authority = ""
        var path = unified
        if (windows && unified.startsWith("//")) {
            val end = unified.indexOf('/', 2)
            authority = if (end < 0) unified.substring(2) else unified.substring(2, end)
            path = if (end < 0) "/" else unified.substring(end)
        } else if (windows && unified.length >= 2 && isAsciiLetter(unified[0]) && unified[1] == ':') {
            path = "/$unified"
        }
        if (!path.startsWith("/")) {
            path = "/$path"
        }
        if (path.length >= 3 && isAsciiLetter(path[1]) && path[2] == ':') {
            path = "/" + path[1].lowercaseChar() + path.substring(2)
        }
        return SCHEME + encode(authority.lowercase(), ':') + encode(path, '/')
    }

    fun toPathText(uri: String): String {
        require(uri.regionMatches(0, SCHEME, 0, SCHEME.length, ignoreCase = true)) { "Not a file URI: $uri" }
        val rest = uri.substring(SCHEME.length)
        val slash = rest.indexOf('/')
        val authority = decode(if (slash < 0) rest else rest.substring(0, slash))
        val path = decode(if (slash < 0) "/" else rest.substring(slash))
        val drive = path.length >= 3 && path[0] == '/' && isAsciiLetter(path[1]) && path[2] == ':' &&
            (path.length == 3 || path[3] == '/')
        val local = if (drive) path.substring(1) else path
        if (authority.isNotEmpty() && !authority.equals("localhost", ignoreCase = true)) {
            return "//$authority$path"
        }
        return local
    }

    private fun isAsciiLetter(char: Char): Boolean = char in 'a'..'z' || char in 'A'..'Z'

    private fun isUnreserved(char: Char): Boolean =
        isAsciiLetter(char) || char in '0'..'9' || char == '-' || char == '.' || char == '_' || char == '~'

    private fun encode(text: String, keep: Char): String {
        val out = StringBuilder(text.length)
        var index = 0
        while (index < text.length) {
            val char = text[index]
            if (isUnreserved(char) || char == keep) {
                out.append(char)
                index++
                continue
            }
            val codePoint = text.codePointAt(index)
            val bytes = String(Character.toChars(codePoint)).toByteArray(StandardCharsets.UTF_8)
            for (byte in bytes) {
                val value = byte.toInt() and 0xFF
                out.append('%').append(HEX[value shr 4]).append(HEX[value and 0xF])
            }
            index += Character.charCount(codePoint)
        }
        return out.toString()
    }

    private fun decode(text: String): String {
        if (!text.contains('%')) {
            return text
        }
        val out = ByteArrayOutputStream()
        var index = 0
        while (index < text.length) {
            val char = text[index]
            if (char == '%' && index + 2 < text.length) {
                val high = Character.digit(text[index + 1], 16)
                val low = Character.digit(text[index + 2], 16)
                if (high >= 0 && low >= 0) {
                    out.write(high * 16 + low)
                    index += 3
                    continue
                }
            }
            val codePoint = text.codePointAt(index)
            out.write(String(Character.toChars(codePoint)).toByteArray(StandardCharsets.UTF_8))
            index += Character.charCount(codePoint)
        }
        return String(out.toByteArray(), StandardCharsets.UTF_8)
    }
}
