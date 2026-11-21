package com.gregorbiswanger.featherspec.studio.runtime

import com.google.gson.JsonParser
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class ReplyBatchTest {
    private fun build(vararg replies: Pair<String, String>): com.google.gson.JsonArray =
        JsonParser.parseString(ReplyBatch.build(replies.map { QueuedReply(it.first, it.second) })).asJsonArray

    @Test
    fun `R-3 an empty list builds an empty array`() {
        assertEquals("[]", ReplyBatch.build(emptyList()))
    }

    @Test
    fun `R-3 the id is merged into each ok and error object in order`() {
        val batch = build("1" to """{"ok":{"a":[1,2]}}""", "2" to """{"error":"nope"}""", "3" to """{"ok":null}""")
        assertEquals(3, batch.size())
        assertEquals(JsonParser.parseString("""{"id":"1","ok":{"a":[1,2]}}"""), batch[0])
        assertEquals(JsonParser.parseString("""{"id":"2","error":"nope"}"""), batch[1])
        assertEquals(JsonParser.parseString("""{"id":"3","ok":null}"""), batch[2])
    }

    @Test
    fun `R-3 a null ok stays in the entry as null`() {
        assertEquals("""[{"id":"3","ok":null}]""", ReplyBatch.build(listOf(QueuedReply("3", """{"ok":null}"""))))
    }

    @Test
    fun `R-3 text with quotes newlines and separators survives the round trip`() {
        val text = "line\nnext \"q\" \\     \u0001 😀"
        val resultJson = com.google.gson.JsonObject().apply { addProperty("ok", text) }.toString()
        val entry = build("9" to resultJson)[0].asJsonObject
        assertEquals(text, entry.get("ok").asString)
        assertEquals("9", entry.get("id").asString)
    }

    @Test
    fun `R-3 the batch is safe inside a script string literal`() {
        val resultJson = com.google.gson.JsonObject().apply { addProperty("ok", "a b\"c\n") }.toString()
        val batch = ReplyBatch.build(listOf(QueuedReply("1", resultJson), QueuedReply("2", """{"error":"x"}""")))
        val script = BridgeFrames.script("resolveMany", batch)
        assertTrue(script.startsWith("FeatherSpecHost.resolveMany(\""))
        assertTrue(script.endsWith("\");"))
        val literal = script.removePrefix("FeatherSpecHost.resolveMany(").removeSuffix(");")
        assertEquals(batch, JsonParser.parseString(literal).asString)
    }

    @Test
    fun `R-3 a large number keeps its digits`() {
        assertEquals("""[{"id":"1","ok":12345678901234567890}]""", ReplyBatch.build(listOf(QueuedReply("1", """{"ok":12345678901234567890}"""))))
    }

    @Test
    fun `R-3 an id inside the reply does not replace the call id`() {
        val entry = build("5" to """{"id":"evil","ok":1}""")[0].asJsonObject
        assertEquals("5", entry.get("id").asString)
        assertEquals(1, entry.get("ok").asInt)
    }

    @Test
    fun `R-3 a reply that is not an object becomes an entry with only the id`() {
        assertEquals("""[{"id":"1"},{"id":"2"}]""", ReplyBatch.build(listOf(QueuedReply("1", "null"), QueuedReply("2", "[1]"))))
    }

    @Test
    fun `R-3 a reply that is not JSON becomes an error entry`() {
        val entry = build("1" to "{oops")[0].asJsonObject
        assertEquals("1", entry.get("id").asString)
        assertTrue(entry.get("error").asString.isNotEmpty())
    }
}
