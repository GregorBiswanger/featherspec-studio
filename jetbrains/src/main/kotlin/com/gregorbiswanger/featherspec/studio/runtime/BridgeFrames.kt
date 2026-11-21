package com.gregorbiswanger.featherspec.studio.runtime

import com.google.gson.JsonObject
import com.google.gson.JsonParser

sealed interface Frame {
    data class Call(val id: String, val name: String, val args: String) : Frame
    data class Emit(val channel: String, val payload: String) : Frame
    data class Reply(val id: String, val ok: String?, val error: String?) : Frame
    data object Ready : Frame
    data class Failed(val error: String) : Frame
    data class Invalid(val text: String) : Frame
}

object BridgeFrames {
    fun parse(frame: String): Frame {
        val root = try {
            JsonParser.parseString(frame)
        } catch (failure: RuntimeException) {
            return Frame.Invalid(frame)
        }
        if (!root.isJsonObject) {
            return Frame.Invalid(frame)
        }
        return fromObject(root.asJsonObject) ?: Frame.Invalid(frame)
    }

    fun jsString(text: String): String {
        val out = StringBuilder(text.length + 2).append('"')
        for (char in text) {
            when {
                char == '"' -> out.append("\\\"")
                char == '\\' -> out.append("\\\\")
                char == '\n' -> out.append("\\n")
                char == '\r' -> out.append("\\r")
                char == '\t' -> out.append("\\t")
                char < ' ' || char == '\u2028' || char == '\u2029' ->
                    out.append("\\u").append(char.code.toString(16).padStart(4, '0'))
                else -> out.append(char)
            }
        }
        return out.append('"').toString()
    }

    fun script(fn: String, vararg args: String): String =
        "FeatherSpecHost.$fn(${args.joinToString(", ") { jsString(it) }});"

    private fun fromObject(root: JsonObject): Frame? {
        return when (root.text("k")) {
            "call" -> {
                val id = root.text("id") ?: return null
                val name = root.text("name") ?: return null
                Frame.Call(id, name, root.raw("args"))
            }
            "emit" -> {
                val channel = root.text("channel") ?: return null
                Frame.Emit(channel, root.raw("payload"))
            }
            "reply" -> {
                val id = root.text("id") ?: return null
                val error = root.text("error")
                if (error != null) Frame.Reply(id, null, error) else Frame.Reply(id, root.raw("ok"), null)
            }
            "ready" -> Frame.Ready
            "failed" -> {
                val error = root.text("error") ?: return null
                Frame.Failed(error)
            }
            else -> null
        }
    }

    private fun JsonObject.text(key: String): String? {
        val member = get(key) ?: return null
        return if (member.isJsonPrimitive && member.asJsonPrimitive.isString) member.asString else null
    }

    private fun JsonObject.raw(key: String): String = get(key)?.toString() ?: "null"
}
