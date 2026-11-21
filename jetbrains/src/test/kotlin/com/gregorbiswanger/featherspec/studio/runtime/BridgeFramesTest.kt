package com.gregorbiswanger.featherspec.studio.runtime

import com.google.gson.JsonParser
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertInstanceOf
import org.junit.jupiter.api.Test

class BridgeFramesTest {
    @Test
    fun `R-3 a call frame parses with id name and raw args`() {
        val frame = BridgeFrames.parse("""{"k":"call","id":"7","name":"fs.stat","args":{"path":"a b"}}""")
        assertEquals(Frame.Call("7", "fs.stat", """{"path":"a b"}"""), frame)
    }

    @Test
    fun `R-3 a call frame without args has null args`() {
        assertEquals(Frame.Call("1", "actions.openStudio", "null"), BridgeFrames.parse("""{"k":"call","id":"1","name":"actions.openStudio"}"""))
    }

    @Test
    fun `R-3 a calls frame parses every call in order with its raw args`() {
        val frame = BridgeFrames.parse(
            """{"k":"calls","calls":[{"id":"1","name":"source.stat","args":{"relativePath":"a b"}},{"id":"2","name":"actions.openStudio"},{"id":"3","name":"source.readBytes","args":["x",1]}]}""",
        )
        assertEquals(
            Frame.Calls(
                listOf(
                    Frame.Call("1", "source.stat", """{"relativePath":"a b"}"""),
                    Frame.Call("2", "actions.openStudio", "null"),
                    Frame.Call("3", "source.readBytes", """["x",1]"""),
                ),
            ),
            frame,
        )
    }

    @Test
    fun `R-3 a calls frame with no calls is an empty batch`() {
        assertEquals(Frame.Calls(emptyList()), BridgeFrames.parse("""{"k":"calls","calls":[]}"""))
    }

    @Test
    fun `R-3 a calls frame keeps large and escaped args intact`() {
        val args = """{"text":"line\nnext \"q\" \u2028","n":12345678901234567890}"""
        val frame = assertInstanceOf(Frame.Calls::class.java, BridgeFrames.parse("""{"k":"calls","calls":[{"id":"9","name":"medium.append","args":$args}]}"""))
        assertEquals(JsonParser.parseString(args), JsonParser.parseString(frame.calls.single().args))
    }

    @Test
    fun `R-3 an emit frame parses with channel and raw payload`() {
        assertEquals(Frame.Emit("tree", """{"rows":[1,2]}"""), BridgeFrames.parse("""{"k":"emit","channel":"tree","payload":{"rows":[1,2]}}"""))
        assertEquals(Frame.Emit("status", "null"), BridgeFrames.parse("""{"k":"emit","channel":"status","payload":null}"""))
        assertEquals(Frame.Emit("log", """["a","b"]"""), BridgeFrames.parse("""{"k":"emit","channel":"log","payload":["a","b"]}"""))
    }

    @Test
    fun `R-3 a reply frame carries ok or error`() {
        assertEquals(Frame.Reply("3", """{"jsHeapBytes":12}""", null), BridgeFrames.parse("""{"k":"reply","id":"3","ok":{"jsHeapBytes":12}}"""))
        assertEquals(Frame.Reply("4", "null", null), BridgeFrames.parse("""{"k":"reply","id":"4","ok":null}"""))
        assertEquals(Frame.Reply("5", "null", null), BridgeFrames.parse("""{"k":"reply","id":"5"}"""))
        assertEquals(Frame.Reply("6", null, "boom"), BridgeFrames.parse("""{"k":"reply","id":"6","error":"boom"}"""))
    }

    @Test
    fun `R-3 ready and failed frames parse`() {
        assertEquals(Frame.Ready, BridgeFrames.parse("""{"k":"ready"}"""))
        assertEquals(Frame.Failed("start threw"), BridgeFrames.parse("""{"k":"failed","error":"start threw"}"""))
    }

    @Test
    fun `R-3 every frame kind of the contract is parsed to a frame other than Invalid`() {
        val samples = mapOf(
            "call" to """{"k":"call","id":"1","name":"x","args":null}""",
            "calls" to """{"k":"calls","calls":[{"id":"1","name":"x","args":null},{"id":"2","name":"y","args":{"a":1}}]}""",
            "emit" to """{"k":"emit","channel":"log","payload":[]}""",
            "reply" to """{"k":"reply","id":"1","ok":1}""",
            "ready" to """{"k":"ready"}""",
            "failed" to """{"k":"failed","error":"e"}""",
        )
        assertEquals(FRAME_KINDS.toSet(), samples.keys)
        for ((kind, text) in samples) {
            assertFalse(BridgeFrames.parse(text) is Frame.Invalid, kind)
        }
    }

    @Test
    fun `R-3 malformed json unknown kind and missing fields are Invalid`() {
        val bad = listOf(
            "",
            "not json",
            "{",
            """{"k":"call","id":"1"""",
            "[]",
            "42",
            "null",
            """{"k":"unknown"}""",
            """{"id":"1"}""",
            """{"k":5}""",
            """{"k":"call","name":"x"}""",
            """{"k":"call","id":"1"}""",
            """{"k":"call","id":1,"name":"x"}""",
            """{"k":"calls"}""",
            """{"k":"calls","calls":null}""",
            """{"k":"calls","calls":{"id":"1","name":"x"}}""",
            """{"k":"calls","calls":"x"}""",
            """{"k":"calls","calls":[{"id":"1","name":"x"},null]}""",
            """{"k":"calls","calls":[{"id":"1","name":"x"},7]}""",
            """{"k":"calls","calls":[{"id":"1","name":"x"},{"name":"y"}]}""",
            """{"k":"calls","calls":[{"id":"1","name":"x"},{"id":"2"}]}""",
            """{"k":"calls","calls":[{"id":2,"name":"x"}]}""",
            """{"k":"calls","calls":[{"id":"1","name":5}]}""",
            """{"k":"emit","payload":1}""",
            """{"k":"reply"}""",
            """{"k":"failed"}""",
        )
        for (text in bad) {
            assertEquals(Frame.Invalid(text), BridgeFrames.parse(text), text)
        }
    }

    @Test
    fun `R-3 frames written by the page round trip through parse`() {
        val args = """{"root":"file:///c%3A/projects/test","text":"line\nnext \"q\" \u2028"}"""
        val text = """{"k":"call","id":"12","name":"medium.append","args":$args}"""
        val frame = assertInstanceOf(Frame.Call::class.java, BridgeFrames.parse(text))
        assertEquals(JsonParser.parseString(args), JsonParser.parseString(frame.args))
    }

    @Test
    fun `R-3 jsString quotes and backslashes`() {
        assertEquals("\"a\\\"b\\\\c\"", BridgeFrames.jsString("a\"b\\c"))
    }

    @Test
    fun `R-3 jsString control characters and line separators are escaped`() {
        assertEquals("\"a\\nb\\rc\\td\"", BridgeFrames.jsString("a\nb\rc\td"))
        assertEquals("\"\\u0001\"", BridgeFrames.jsString("\u0001"))
        assertEquals("\"\\u2028\\u2029\"", BridgeFrames.jsString("\u2028\u2029"))
    }

    @Test
    fun `R-3 jsString result parsed back equals the input`() {
        val inputs = listOf(
            "",
            "plain",
            "quote \" and backslash \\ and slash /",
            "line1\nline2\r\nline3\ttab",
            "sep \u2028 and \u2029 end",
            "emoji \uD83D\uDE00 and umlaut \u00E4 and nul \u0000 and bell \u0007",
            """{"json":"inside","n":[1,2,{"x":"y\n"}]}""",
            "</script><!-- -->",
        )
        for (input in inputs) {
            val literal = BridgeFrames.jsString(input)
            assertFalse(literal.contains('\u2028'), input)
            assertFalse(literal.contains('\u2029'), input)
            assertFalse(literal.contains('\n'), input)
            assertEquals(input, JsonParser.parseString(literal).asString, input)
        }
    }

    @Test
    fun `R-3 script calls a FeatherSpecHost function with string literal arguments`() {
        assertEquals("FeatherSpecHost.start(\"{\\\"a\\\":1}\");", BridgeFrames.script("start", """{"a":1}"""))
        assertEquals("FeatherSpecHost.resolve(\"3\", \"{\\\"ok\\\":null}\");", BridgeFrames.script("resolve", "3", """{"ok":null}"""))
        assertEquals("FeatherSpecHost.dispatch(\"panelClosed\", \"null\");", BridgeFrames.script("dispatch", "panelClosed", "null"))
    }
}
