package com.gregorbiswanger.featherspec.studio.probe

import com.gregorbiswanger.featherspec.studio.setup.ReleaseHttp
import com.sun.net.httpserver.HttpServer
import org.junit.jupiter.api.Assertions.assertArrayEquals
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.IOException
import java.net.InetAddress
import java.net.InetSocketAddress
import java.net.ProxySelector
import java.nio.file.Files
import java.nio.file.Path

class SetupHooksTest {
    @TempDir
    lateinit var temp: Path

    @Test
    fun `AC-022 the fake answers the three setup routes`() {
        val bytes = byteArrayOf(1, 2, 3)
        val routes = FakeReleaseRoutes { bytes }
        val latest = routes.answer(FakeReleaseRoutes.LATEST)
        assertEquals(302, latest.status)
        assertEquals(mapOf("location" to FakeReleaseRoutes.TAG_URL), latest.headers)
        val archive = routes.answer(FakeReleaseRoutes.ARCHIVE)
        assertEquals(302, archive.status)
        assertEquals(mapOf("location" to FakeReleaseRoutes.CODELOAD), archive.headers)
        val download = routes.answer(FakeReleaseRoutes.CODELOAD)
        assertEquals(200, download.status)
        assertArrayEquals(bytes, download.body)
        assertEquals(
            "{\"served\":[\"${FakeReleaseRoutes.LATEST}\",\"${FakeReleaseRoutes.ARCHIVE}\",\"${FakeReleaseRoutes.CODELOAD}\"],\"refused\":[]}",
            routes.toJson(),
        )
    }

    @Test
    fun `the route urls are the ones of the setup world`() {
        assertEquals("https://github.com/GregorBiswanger/featherspec/releases/latest", FakeReleaseRoutes.LATEST)
        assertEquals("https://github.com/GregorBiswanger/featherspec/archive/refs/tags/v1.10.0.tar.gz", FakeReleaseRoutes.ARCHIVE)
        assertEquals("https://codeload.github.com/GregorBiswanger/featherspec/tar.gz/refs/tags/v1.10.0", FakeReleaseRoutes.CODELOAD)
        assertEquals(listOf(FakeReleaseRoutes.LATEST, FakeReleaseRoutes.ARCHIVE, FakeReleaseRoutes.CODELOAD), FakeReleaseRoutes.EXPECTED_SERVED)
    }

    @Test
    fun `an unknown url is refused and recorded, not served`() {
        val routes = FakeReleaseRoutes { ByteArray(0) }
        assertThrows(IOException::class.java) { routes.answer("https://example.com/x") }
        assertEquals("{\"served\":[],\"refused\":[\"https://example.com/x\"]}", routes.toJson())
    }

    @Test
    fun `the archive is read only when the download is requested`() {
        var reads = 0
        val routes = FakeReleaseRoutes { reads += 1; ByteArray(0) }
        routes.answer(FakeReleaseRoutes.LATEST)
        routes.answer(FakeReleaseRoutes.ARCHIVE)
        assertEquals(0, reads)
        routes.answer(FakeReleaseRoutes.CODELOAD)
        assertEquals(1, reads)
    }

    @Test
    fun `AC-022 the hooks are off unless the probe is setup`() {
        for (probe in listOf(null, "", "conformance", "Setup", "setup ")) {
            assertNull(SetupHooks.routes(probe, "/x"), "routes for $probe")
            assertNull(SetupHooks.uiAnswers(probe), "ui for $probe")
            assertFalse(SetupHooks.active(probe))
        }
        assertTrue(SetupHooks.active("setup"))
        assertNotNull(SetupHooks.routes("setup", null))
        assertNotNull(SetupHooks.uiAnswers("setup"))
    }

    @Test
    fun `the hooks of the running IDE are off in a plain JVM`() {
        assertNull(ProbeHooks.routes)
        assertNull(ProbeHooks.uiAnswers)
    }

    @Test
    fun `a setup probe without an archive property fails at the download`() {
        val routes = checkNotNull(SetupHooks.routes("setup", null))
        assertThrows(IllegalStateException::class.java) { routes.answer(FakeReleaseRoutes.CODELOAD) }
    }

    @Test
    fun `the archive property names the file the download returns`() {
        val file = temp.resolve("release.tar.gz")
        Files.write(file, byteArrayOf(9, 8, 7))
        val routes = checkNotNull(SetupHooks.routes("setup", file.toString()))
        assertArrayEquals(byteArrayOf(9, 8, 7), routes.answer(FakeReleaseRoutes.CODELOAD).body)
    }

    @Test
    fun `AC-022 release http answers from the fake without a connection`() {
        val http = ReleaseHttp({ error("no client may be built") }, canned = FakeReleaseRoutes { ByteArray(0) })
        val reply = http.get(FakeReleaseRoutes.LATEST, mapOf("User-Agent" to "x"))
        assertEquals(302, reply.status)
        assertEquals(FakeReleaseRoutes.TAG_URL, reply.headers["location"])
        assertThrows(IOException::class.java) { http.get("https://example.com/", emptyMap()) }
    }

    @Test
    fun `AC-022 release http without the hook talks to the network`() {
        val server = HttpServer.create(InetSocketAddress(InetAddress.getLoopbackAddress(), 0), 0)
        server.createContext("/real") { exchange ->
            exchange.sendResponseHeaders(204, -1)
            exchange.close()
        }
        server.start()
        try {
            val base = "http://${server.address.address.hostAddress}:${server.address.port}"
            val http = ReleaseHttp({ ReleaseHttp.newClient(ProxySelector.of(null)) }, canned = null)
            assertEquals(204, http.get("$base/real", emptyMap()).status)
            val plain = ReleaseHttp({ ReleaseHttp.newClient(ProxySelector.of(null)) })
            assertEquals(204, plain.get("$base/real", emptyMap()).status)
        } finally {
            server.stop(0)
        }
    }

    @Test
    fun `the scripted answers confirm, pick the first item and choose no action`() {
        assertEquals("{\"ok\":true}", SetupUiAnswers.answer("ui.confirm", """{"message":"m","confirmLabel":"c"}"""))
        assertEquals("{\"ok\":0}", SetupUiAnswers.answer("ui.pick", """{"items":[{"label":"a"},{"label":"b"}]}"""))
        assertEquals("{\"ok\":null}", SetupUiAnswers.answer("ui.pick", """{"items":[]}"""))
        assertEquals("{\"ok\":null}", SetupUiAnswers.answer("ui.notify", """{"message":"m","actions":["x","y"]}"""))
    }

    @Test
    fun `other ui calls and malformed picks are left to the real handler`() {
        assertNull(SetupUiAnswers.answer("ui.progressStart", """{"title":"t"}"""))
        assertNull(SetupUiAnswers.answer("ui.openExternal", """{"url":"https://x.test"}"""))
        assertNull(SetupUiAnswers.answer("ui.pick", "{}"))
    }
}
