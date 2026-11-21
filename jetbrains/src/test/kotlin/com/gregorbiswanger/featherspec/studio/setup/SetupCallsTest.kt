package com.gregorbiswanger.featherspec.studio.setup

import com.google.gson.JsonObject
import com.google.gson.JsonParser
import com.gregorbiswanger.featherspec.studio.ports.FileUris
import com.gregorbiswanger.featherspec.studio.ports.HostOs
import com.sun.net.httpserver.HttpServer
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.net.InetAddress
import java.net.InetSocketAddress
import java.net.ProxySelector
import java.nio.file.Files
import java.nio.file.Path
import java.util.Base64

class SetupCallsTest {
    private val calls = SetupCalls(http = ReleaseHttp({ ReleaseHttp.newClient(ProxySelector.of(null)) }))

    private fun quote(text: String): String = JsonObject().apply { addProperty("v", text) }.get("v").toString()

    private fun base64(text: String): String = Base64.getEncoder().encodeToString(text.toByteArray())

    private fun reply(name: String, args: String): JsonObject =
        JsonParser.parseString(calls.answer(name, args) ?: throw AssertionError("no answer for $name")).asJsonObject

    private fun rootOf(directory: Path): String = quote(FileUris.toUri(directory, HostOs.windows))

    @Test
    fun `a name that is not a setup call has no answer`() {
        assertNull(calls.answer("source.list", "{}"))
        assertNull(calls.answer("target.other", "{}"))
    }

    @Test
    fun `AC-022 the target calls have the wire shapes of the bridge contract`(@TempDir temp: Path) {
        val root = rootOf(temp)
        assertEquals("""{"ok":null}""", calls.answer("target.kind", """{"root":$root,"relativePath":"a.txt"}"""))
        assertEquals(
            """{"ok":"created"}""",
            calls.answer("target.createExclusive", """{"root":$root,"relativePath":"d/a.txt","bytes":"${base64("one")}"}"""),
        )
        assertEquals(
            """{"ok":"exists"}""",
            calls.answer("target.createExclusive", """{"root":$root,"relativePath":"d/a.txt","bytes":"${base64("two")}"}"""),
        )
        assertEquals("""{"ok":"file"}""", calls.answer("target.kind", """{"root":$root,"relativePath":"d/a.txt"}"""))
        assertEquals("""{"ok":"directory"}""", calls.answer("target.kind", """{"root":$root,"relativePath":"d"}"""))
        assertEquals("""{"ok":"${base64("one")}"}""", calls.answer("target.readBytes", """{"root":$root,"relativePath":"d/a.txt"}"""))
        assertEquals("""{"ok":["a.txt"]}""", calls.answer("target.listDirectory", """{"root":$root,"relativePath":"d"}"""))
        assertEquals("""{"ok":null}""", calls.answer("target.listDirectory", """{"root":$root,"relativePath":"none"}"""))
        assertEquals(
            """{"ok":"changed"}""",
            calls.answer(
                "target.replaceIfUnchanged",
                """{"root":$root,"relativePath":"d/a.txt","expected":"${base64("zzz")}","next":"${base64("new")}"}""",
            ),
        )
        assertEquals(
            """{"ok":"replaced"}""",
            calls.answer(
                "target.replaceIfUnchanged",
                """{"root":$root,"relativePath":"d/a.txt","expected":"${base64("one")}","next":"${base64("new")}"}""",
            ),
        )
        assertEquals("new", Files.readString(temp.resolve("d/a.txt")))
    }

    @Test
    fun `AC-022 clearSetupFolder answers null and removes the folder`(@TempDir temp: Path) {
        Files.createDirectories(temp.resolve(".featherspec-setup/x"))
        assertEquals("""{"ok":null}""", calls.answer("target.clearSetupFolder", """{"root":${rootOf(temp)}}"""))
        assertFalse(Files.exists(temp.resolve(".featherspec-setup")))
    }

    @Test
    fun `a failing target call throws with the reason and a missing argument is named`(@TempDir temp: Path) {
        val root = rootOf(temp)
        val failure = assertThrows(java.io.IOException::class.java) {
            calls.answer("target.readBytes", """{"root":$root,"relativePath":"missing"}""")
        }
        assertEquals("no such file or directory", failure.message)
        val missing = assertThrows(IllegalArgumentException::class.java) { calls.answer("target.kind", """{"root":$root}""") }
        assertEquals("Missing argument: relativePath", missing.message)
    }

    @Test
    fun `AC-005 archive read of the real release archive answers the entries as base64`() {
        val expected = SetupFixtures.expectedEntries()
        val args = JsonObject().apply {
            addProperty("bytes", Base64.getEncoder().encodeToString(SetupFixtures.archiveBytes()))
            addProperty("maxUnpackedBytes", SetupFixtures.expectedLimit())
        }.toString()
        val outer = reply("archive.read", args)
        val result = outer.getAsJsonObject("ok")
        assertTrue(result.get("ok").asBoolean)
        val entries = result.getAsJsonArray("entries")
        assertEquals(expected.size, entries.size())
        for ((index, element) in entries.withIndex()) {
            val entry = element.asJsonObject
            val want = expected[index]
            assertEquals(want.path, entry.get("path").asString)
            assertEquals(want.kind, entry.get("kind").asString)
            assertEquals(want.sha256, SetupFixtures.sha256(Base64.getDecoder().decode(entry.get("bytes").asString)), want.path)
        }
    }

    @Test
    fun `AC-005 archive read answers too-large and unreadable in the wire shape`() {
        val archive = Base64.getEncoder().encodeToString(SetupFixtures.archiveBytes())
        assertEquals(
            """{"ok":{"ok":false,"failure":"too-large"}}""",
            calls.answer("archive.read", """{"bytes":"$archive","maxUnpackedBytes":1000}"""),
        )
        val unreadable = reply("archive.read", """{"bytes":"${base64("not gzip")}","maxUnpackedBytes":1000}""").getAsJsonObject("ok")
        assertFalse(unreadable.get("ok").asBoolean)
        assertEquals("unreadable", unreadable.get("failure").asString)
        assertTrue(unreadable.get("detail").asString.isNotEmpty())
    }

    @Test
    fun `AC-022 http get answers status lower-case headers and the body as base64`() {
        val server = HttpServer.create(InetSocketAddress(InetAddress.getLoopbackAddress(), 0), 0)
        server.createContext("/ok") { exchange ->
            exchange.responseHeaders.add("X-Thing", "Alpha")
            exchange.sendResponseHeaders(200, 5)
            exchange.responseBody.use { it.write("hello".toByteArray()) }
            exchange.close()
        }
        server.createContext("/moved") { exchange ->
            exchange.responseHeaders.add("Location", "http://127.0.0.1:1/elsewhere")
            exchange.sendResponseHeaders(302, -1)
            exchange.close()
        }
        server.start()
        try {
            val base = "http://127.0.0.1:${server.address.port}"
            val ok = reply("http.get", """{"url":"$base/ok","headers":{"User-Agent":"FeatherSpec-Studio/1.0.0"}}""").getAsJsonObject("ok")
            assertEquals(200, ok.get("status").asInt)
            assertEquals("Alpha", ok.getAsJsonObject("headers").get("x-thing").asString)
            assertEquals(base64("hello"), ok.get("body").asString)
            val moved = reply("http.get", """{"url":"$base/moved","headers":{}}""").getAsJsonObject("ok")
            assertEquals(302, moved.get("status").asInt)
            assertEquals("http://127.0.0.1:1/elsewhere", moved.getAsJsonObject("headers").get("location").asString)
            assertEquals("", moved.get("body").asString)
        } finally {
            server.stop(0)
        }
    }
}
