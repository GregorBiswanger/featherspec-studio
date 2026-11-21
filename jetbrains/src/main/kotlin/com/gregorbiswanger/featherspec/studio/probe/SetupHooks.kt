package com.gregorbiswanger.featherspec.studio.probe

import com.gregorbiswanger.featherspec.studio.setup.HttpReply
import com.gregorbiswanger.featherspec.studio.ui.UiRequests
import com.google.gson.JsonArray
import com.google.gson.JsonObject
import java.io.IOException
import java.nio.file.Files
import java.nio.file.Path
import java.util.concurrent.CopyOnWriteArrayList

class FakeReleaseRoutes(private val archive: () -> ByteArray) {
    private val served = CopyOnWriteArrayList<String>()
    private val refused = CopyOnWriteArrayList<String>()

    fun answer(url: String): HttpReply {
        val reply = when (url) {
            LATEST -> HttpReply(302, mapOf("location" to TAG_URL), ByteArray(0))
            ARCHIVE -> HttpReply(302, mapOf("location" to CODELOAD), ByteArray(0))
            CODELOAD -> HttpReply(200, emptyMap(), archive())
            else -> {
                refused.add(url)
                throw IOException("the setup probe has no canned answer for $url")
            }
        }
        served.add(url)
        return reply
    }

    fun toJson(): String = JsonObject().apply {
        add("served", array(served))
        add("refused", array(refused))
    }.toString()

    private fun array(items: List<String>): JsonArray = JsonArray().apply { items.forEach { add(it) } }

    companion object {
        const val TAG_URL = "https://github.com/GregorBiswanger/featherspec/releases/tag/v1.10.0"
        const val CODELOAD = "https://codeload.github.com/GregorBiswanger/featherspec/tar.gz/refs/tags/v1.10.0"
        const val LATEST = "https://github.com/GregorBiswanger/featherspec/releases/latest"
        const val ARCHIVE = "https://github.com/GregorBiswanger/featherspec/archive/refs/tags/v1.10.0.tar.gz"
        val EXPECTED_SERVED = listOf(LATEST, ARCHIVE, CODELOAD)
    }
}

object SetupUiAnswers {
    fun answer(name: String, argsJson: String): String? = when (name) {
        "ui.confirm" -> UiRequests.confirmed(true)
        "ui.pick" -> UiRequests.pick(argsJson)?.let { request -> UiRequests.index(request.entries.firstOrNull()?.index) }
        "ui.notify" -> UiRequests.chosen(null)
        else -> null
    }
}

object SetupHooks {
    const val PROBE_NAME = "setup"
    const val ARCHIVE_PROPERTY = "featherspec.probe.releaseArchive"

    fun active(probe: String?): Boolean = probe == PROBE_NAME

    fun routes(probe: String?, archivePath: String?): FakeReleaseRoutes? {
        if (!active(probe)) {
            return null
        }
        return FakeReleaseRoutes {
            val path = checkNotNull(archivePath) { "$ARCHIVE_PROPERTY is not set" }
            Files.readAllBytes(Path.of(path))
        }
    }

    fun uiAnswers(probe: String?): SetupUiAnswers? = if (active(probe)) SetupUiAnswers else null
}

object ProbeHooks {
    val routes: FakeReleaseRoutes? by lazy {
        SetupHooks.routes(System.getProperty(ProbeProperties.PROBE), System.getProperty(SetupHooks.ARCHIVE_PROPERTY))
    }

    val uiAnswers: SetupUiAnswers? by lazy { SetupHooks.uiAnswers(System.getProperty(ProbeProperties.PROBE)) }
}
