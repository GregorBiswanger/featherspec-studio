package com.gregorbiswanger.featherspec.studio.setup

import com.sun.net.httpserver.HttpExchange
import com.sun.net.httpserver.HttpServer
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertArrayEquals
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import java.io.IOException
import java.net.InetAddress
import java.net.InetSocketAddress
import java.net.Proxy
import java.net.ProxySelector
import java.net.SocketAddress
import java.net.URI
import java.util.concurrent.CopyOnWriteArrayList
import java.util.concurrent.atomic.AtomicInteger

class ReleaseHttpTest {
    private lateinit var server: HttpServer
    private val requests = CopyOnWriteArrayList<Pair<String, Set<String>>>()
    private val targetHits = AtomicInteger()

    private val http = ReleaseHttp({ ReleaseHttp.newClient(ProxySelector.of(null)) })

    private val base: String
        get() = "http://127.0.0.1:${server.address.port}"

    @BeforeEach
    fun start() {
        server = HttpServer.create(InetSocketAddress(InetAddress.getLoopbackAddress(), 0), 0)
        server.createContext("/") { exchange -> answer(exchange) }
        server.start()
    }

    @AfterEach
    fun stop() {
        server.stop(0)
    }

    private fun answer(exchange: HttpExchange) {
        val path = exchange.requestURI.path
        requests.add(path to exchange.requestHeaders.keys.map { it.lowercase() }.toSet())
        when (path) {
            "/ok" -> {
                exchange.responseHeaders.add("X-Custom-Thing", "Alpha")
                exchange.responseHeaders.add("Content-Type", "application/x-gzip")
                send(exchange, 200, "hello".toByteArray())
            }
            "/redirect" -> {
                exchange.responseHeaders.add("Location", "$base/target")
                exchange.sendResponseHeaders(302, -1)
                exchange.close()
            }
            "/target" -> {
                targetHits.incrementAndGet()
                send(exchange, 200, "target".toByteArray())
            }
            "/cookie" -> {
                exchange.responseHeaders.add("Set-Cookie", "session=abc")
                send(exchange, 200, "cookie".toByteArray())
            }
            "/auth" -> {
                exchange.responseHeaders.add("WWW-Authenticate", "Basic realm=\"x\"")
                send(exchange, 401, "no".toByteArray())
            }
            "/missing" -> send(exchange, 404, "not found body".toByteArray())
            "/big" -> send(exchange, 200, ByteArray(50) { 1 })
            else -> send(exchange, 500, ByteArray(0))
        }
    }

    private fun send(exchange: HttpExchange, status: Int, body: ByteArray) {
        if (body.isEmpty()) {
            exchange.sendResponseHeaders(status, -1)
        } else {
            exchange.sendResponseHeaders(status, body.size.toLong())
            exchange.responseBody.use { it.write(body) }
        }
        exchange.close()
    }

    @Test
    fun `AC-022 a 200 gives the status the lower-case headers and the body`() {
        val reply = http.get("$base/ok", emptyMap())
        assertEquals(200, reply.status)
        assertEquals("Alpha", reply.headers["x-custom-thing"])
        assertEquals("application/x-gzip", reply.headers["content-type"])
        assertTrue(reply.headers.keys.all { it == it.lowercase() })
        assertArrayEquals("hello".toByteArray(), reply.body)
    }

    @Test
    fun `AC-022 a 302 is returned and not followed`() {
        val reply = http.get("$base/redirect", emptyMap())
        assertEquals(302, reply.status)
        assertEquals("$base/target", reply.headers["location"])
        assertEquals(0, reply.body.size)
        assertEquals(0, targetHits.get())
        assertEquals(listOf("/redirect"), requests.map { it.first })
    }

    @Test
    fun `AC-022 no cookie and no credentials are sent and a 401 is returned as it is`() {
        http.get("$base/cookie", emptyMap())
        http.get("$base/cookie", emptyMap())
        val unauthorized = http.get("$base/auth", emptyMap())
        assertEquals(401, unauthorized.status)
        assertEquals("Basic realm=\"x\"", unauthorized.headers["www-authenticate"])
        assertEquals(3, requests.size)
        for ((_, names) in requests) {
            assertFalse("cookie" in names, names.toString())
            assertFalse("authorization" in names, names.toString())
            assertFalse("proxy-authorization" in names, names.toString())
        }
    }

    @Test
    fun `the request headers of the caller are sent`() {
        val seenAgent = ArrayList<String>()
        server.removeContext("/")
        server.createContext("/") { exchange ->
            seenAgent.add(exchange.requestHeaders.getFirst("User-Agent"))
            send(exchange, 200, "x".toByteArray())
        }
        http.get("$base/ua", mapOf("User-Agent" to "FeatherSpec-Studio/1.0.0"))
        assertEquals(listOf("FeatherSpec-Studio/1.0.0"), seenAgent)
    }

    @Test
    fun `a status other than 200 carries no body`() {
        val reply = http.get("$base/missing", emptyMap())
        assertEquals(404, reply.status)
        assertEquals(0, reply.body.size)
    }

    @Test
    fun `a body above the limit is cut one byte past it so the core can refuse it`() {
        val small = ReleaseHttp({ ReleaseHttp.newClient(ProxySelector.of(null)) }, maxBodyBytes = 10)
        assertEquals(11, small.get("$base/big", emptyMap()).body.size)
        val exact = ReleaseHttp({ ReleaseHttp.newClient(ProxySelector.of(null)) }, maxBodyBytes = 50)
        assertEquals(50, exact.get("$base/big", emptyMap()).body.size)
    }

    @Test
    fun `AC-022 the proxy selector of the IDE is asked for the request`() {
        val asked = CopyOnWriteArrayList<URI>()
        val selector = object : ProxySelector() {
            override fun select(uri: URI): MutableList<Proxy> {
                asked.add(uri)
                return mutableListOf(Proxy.NO_PROXY)
            }

            override fun connectFailed(uri: URI, address: SocketAddress, failure: IOException) {
            }
        }
        val reply = ReleaseHttp({ ReleaseHttp.newClient(selector) }).get("$base/ok", emptyMap())
        assertEquals(200, reply.status)
        assertTrue(asked.any { it.toString().startsWith(base) }, asked.toString())
    }

    @Test
    fun `a scheme other than http and https is refused`() {
        assertThrows(IllegalArgumentException::class.java) { http.get("file:///etc/passwd", emptyMap()) }
        assertThrows(IllegalArgumentException::class.java) { http.get("ftp://example.org/a", emptyMap()) }
    }

    @Test
    fun `a refused connection is an error`() {
        val port = java.net.ServerSocket(0, 1, InetAddress.getLoopbackAddress()).use { it.localPort }
        assertThrows(IOException::class.java) { http.get("http://127.0.0.1:$port/ok", emptyMap()) }
    }
}
