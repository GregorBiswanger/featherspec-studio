package com.gregorbiswanger.featherspec.studio.ports

import com.google.gson.JsonNull
import com.google.gson.JsonObject
import com.google.gson.JsonParser

class UiMemory(private val entries: MutableMap<String, String>) {
    fun forProject(projectBase: String): Map<String, String> {
        val prefix = prefixOf(projectBase)
        val result = LinkedHashMap<String, String>()
        synchronized(entries) {
            for ((stored, value) in entries) {
                if (stored.startsWith(prefix)) {
                    val key = stored.substring(prefix.length)
                    if (!key.contains(SEPARATOR)) {
                        result[key] = value
                    }
                }
            }
        }
        return result
    }

    fun set(projectBase: String, key: String, value: String?) {
        val stored = prefixOf(projectBase) + key
        synchronized(entries) {
            if (value == null) {
                entries.remove(stored)
            } else {
                entries[stored] = value
            }
        }
    }

    fun answer(name: String, argsJson: String, projectBase: String): String? {
        if (name != "memory.set") {
            return null
        }
        return try {
            val args = JsonParser.parseString(argsJson).asJsonObject
            val key = args.get("key")
            require(key != null && key.isJsonPrimitive) { "Missing argument: key" }
            val value = args.get("value")
            require(value == null || value.isJsonNull || value.isJsonPrimitive) { "Invalid argument: value" }
            set(projectBase, key.asString, if (value == null || value.isJsonNull) null else value.asString)
            JsonObject().apply { add("ok", JsonNull.INSTANCE) }.toString()
        } catch (failure: RuntimeException) {
            JsonObject().apply { addProperty("error", failure.message ?: failure.javaClass.simpleName) }.toString()
        }
    }

    private fun prefixOf(projectBase: String): String = projectBase + SEPARATOR

    private companion object {
        const val SEPARATOR = '|'
    }
}
