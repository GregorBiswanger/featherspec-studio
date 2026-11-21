package com.gregorbiswanger.featherspec.studio.probe

import com.google.gson.JsonParser
import java.util.Base64

object ProbeJson {
    fun unquote(raw: String): String = JsonParser.parseString(raw).asString

    fun heapBytes(okJson: String): Long? {
        val root = JsonParser.parseString(okJson)
        if (!root.isJsonObject) {
            return null
        }
        val member = root.asJsonObject.get("jsHeapBytes") ?: return null
        return if (member.isJsonPrimitive && member.asJsonPrimitive.isNumber) member.asLong else null
    }

    fun touch(inputJson: String, extraNewlines: Int): String {
        val root = JsonParser.parseString(inputJson).asJsonObject
        val files = root.getAsJsonObject("files")
        val key = files.keySet().firstOrNull { it.startsWith(".specs/") && it.endsWith(".md") } ?: files.keySet().first()
        val bytes = Base64.getDecoder().decode(files.get(key).asString)
        val changed = bytes + "\n".repeat(extraNewlines).toByteArray(Charsets.UTF_8)
        files.addProperty(key, Base64.getEncoder().encodeToString(changed))
        return root.toString()
    }
}
