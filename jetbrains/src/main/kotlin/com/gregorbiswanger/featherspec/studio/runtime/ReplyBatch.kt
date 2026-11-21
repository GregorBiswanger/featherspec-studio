package com.gregorbiswanger.featherspec.studio.runtime

import com.google.gson.JsonArray
import com.google.gson.JsonElement
import com.google.gson.JsonObject
import com.google.gson.JsonParser

data class QueuedReply(val id: String, val resultJson: String)

object ReplyBatch {
    fun build(replies: List<QueuedReply>): String {
        val array = JsonArray()
        for (reply in replies) {
            array.add(entry(reply))
        }
        return array.toString()
    }

    private fun entry(reply: QueuedReply): JsonObject {
        val entry = JsonObject()
        entry.addProperty("id", reply.id)
        val parsed: JsonElement = try {
            JsonParser.parseString(reply.resultJson)
        } catch (failure: RuntimeException) {
            entry.addProperty("error", "The host reply was not valid JSON")
            return entry
        }
        if (parsed.isJsonObject) {
            for ((key, value) in parsed.asJsonObject.entrySet()) {
                if (key != "id") {
                    entry.add(key, value)
                }
            }
        }
        return entry
    }
}
