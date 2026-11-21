package com.gregorbiswanger.featherspec.studio.setup

import com.gregorbiswanger.featherspec.studio.probe.FakeReleaseRoutes
import com.gregorbiswanger.featherspec.studio.probe.ProbeHooks
import java.io.ByteArrayOutputStream
import java.io.IOException
import java.io.InputStream
import java.net.ProxySelector
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.time.Duration

class HttpReply(val status: Int, val headers: Map<String, String>, val body: ByteArray)

class ReleaseHttp(
    clientOf: () -> HttpClient = { newClient(ProxySelector.getDefault()) },
    private val maxBodyBytes: Int = DEFAULT_MAX_BODY_BYTES,
    private val answerTimeout: Duration = Duration.ofSeconds(ANSWER_SECONDS),
    private val bodyTimeout: Duration = Duration.ofSeconds(BODY_SECONDS),
    private val canned: FakeReleaseRoutes? = ProbeHooks.routes,
) {
    private val client: HttpClient by lazy(clientOf)

    fun get(url: String, headers: Map<String, String>): HttpReply {
        if (canned != null) {
            return canned.answer(url)
        }
        val builder = HttpRequest.newBuilder(URI.create(url)).GET().timeout(answerTimeout)
        headers.forEach { (name, value) -> builder.header(name, value) }
        val response = client.send(builder.build(), HttpResponse.BodyHandlers.ofInputStream())
        response.body().use { stream ->
            val body = if (response.statusCode() == 200) readLimited(stream) else ByteArray(0)
            return HttpReply(response.statusCode(), flatten(response.headers().map()), body)
        }
    }

    private fun readLimited(stream: InputStream): ByteArray {
        val output = ByteArrayOutputStream()
        val buffer = ByteArray(BUFFER)
        val limit = maxBodyBytes + 1
        val deadline = System.nanoTime() + bodyTimeout.toNanos()
        var total = 0
        while (total < limit) {
            if (System.nanoTime() > deadline) {
                throw IOException("the download took too long")
            }
            val count = stream.read(buffer, 0, minOf(buffer.size, limit - total))
            if (count < 0) {
                break
            }
            output.write(buffer, 0, count)
            total += count
        }
        return output.toByteArray()
    }

    private fun flatten(source: Map<String, List<String>>): Map<String, String> {
        val result = LinkedHashMap<String, String>()
        for ((name, values) in source) {
            if (!name.startsWith(":")) {
                result[name.lowercase()] = values.joinToString(", ")
            }
        }
        return result
    }

    companion object {
        const val DEFAULT_MAX_BODY_BYTES = 20 * 1024 * 1024
        private const val ANSWER_SECONDS = 30L
        private const val BODY_SECONDS = 120L
        private const val BUFFER = 64 * 1024

        fun newClient(selector: ProxySelector?): HttpClient {
            val builder = HttpClient.newBuilder()
                .followRedirects(HttpClient.Redirect.NEVER)
                .version(HttpClient.Version.HTTP_1_1)
                .connectTimeout(Duration.ofSeconds(ANSWER_SECONDS))
            if (selector != null) {
                builder.proxy(selector)
            }
            return builder.build()
        }
    }
}
