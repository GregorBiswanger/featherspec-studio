package com.gregorbiswanger.featherspec.spike

import com.intellij.openapi.actionSystem.ActionUpdateThread
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.project.Project
import com.intellij.ui.jcef.JBCefBrowser
import com.intellij.ui.jcef.JBCefJSQuery
import java.nio.file.Files
import java.nio.file.Path
import java.util.concurrent.CompletableFuture
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicInteger

private const val V2_SEPARATOR = "\u001F"

class SpikeV2Action : AnAction() {
    override fun actionPerformed(event: AnActionEvent) {
        val project = event.project ?: return
        ApplicationManager.getApplication().executeOnPooledThread { runSpikeV2(project) }
    }

    override fun getActionUpdateThread(): ActionUpdateThread = ActionUpdateThread.BGT
}

fun runSpikeV2(project: Project) {
    val out = Path.of(System.getProperty("spike.out"))
    Files.createDirectories(out)
    val json = try {
        V2Run().run()
    } catch (failure: Throwable) {
        "{\"error\":${quoteJson(failure.toString())}}"
    }
    Files.writeString(out.resolve("s1v2-results.json"), json)
}

fun coreHtml(nonce: String, postRequest: String): String {
    val policy = "default-src 'none'; script-src 'nonce-$nonce'"
    return listOf(
        "<!DOCTYPE html>",
        "<html lang=\"en\">",
        "<head>",
        "<meta charset=\"UTF-8\">",
        "<meta http-equiv=\"Content-Security-Policy\" content=\"$policy\">",
        "<title>FeatherSpec core spike</title>",
        "</head>",
        "<body>",
        "<script nonce=\"$nonce\" src=\"$SPIKE_ORIGIN/core-spike.js\"></script>",
        "<script nonce=\"$nonce\">${v2Harness(postRequest)}</script>",
        "</body>",
        "</html>",
        "",
    ).joinToString("\n")
}

private fun v2Harness(postRequest: String): String = """(function () {
    var send = function (id, status, payload) {
        var request = id + '\u001f' + status + '\u001f' + payload;
        $postRequest;
    };
    window.featherspecV2Run = function (id, text) {
        try {
            var input = JSON.parse(text);
            FeatherSpecSpike.run(JSON.stringify(input.files), input.version).then(
                function (value) { send(id, 'ok', value); },
                function (error) { send(id, 'error', String(error)); });
        } catch (error) {
            send(id, 'error', String(error));
        }
    };
    window.featherspecV2Timers = function () {
        var waits = [];
        for (var index = 0; index < 10; index++) {
            waits.push(new Promise(function (resolve) {
                var started = performance.now();
                setTimeout(function () { resolve(Math.round(performance.now() - started)); }, 100);
            }));
        }
        Promise.all(waits).then(function (delays) { send('timers', 'ok', delays.join(',')); });
    };
    send('ready', 'ok', '');
})();"""

private class V2Run {
    private val replies = ConcurrentHashMap<String, CompletableFuture<String>>()
    private val calls = AtomicInteger(0)
    private var query: JBCefJSQuery? = null

    fun run(): String {
        val names = resourceText("v2/inputs.txt").lines().filter { it.isNotBlank() }.map { it.removeSuffix(".json") }
        val coldStarted = System.nanoTime()
        val browser = open()
        try {
            await("ready", 120)
            val coldStartMs = millisSince(coldStarted)
            browser.cefBrowser.executeJavaScript("featherspecV2Timers();", PAGE_URL, 0)
            val timers = await("timers", 60).split(",").filter { it.isNotEmpty() }.map { it.toLong() }

            val generated = resourceText("v2/inputs/generated-200.json")
            val gen200FirstMs = call(browser, generated).second
            val gen200SecondMs = call(browser, generated).second

            val perFixture = linkedMapOf<String, Long>()
            var identical = 0
            for (name in names) {
                val (actual, millis) = call(browser, resourceText("v2/inputs/$name.json"))
                perFixture[name] = millis
                val expected = resourceBytes("v2/node-expected/$name.json")
                if (expected.contentEquals(actual.toByteArray(Charsets.UTF_8))) identical++
            }

            return buildString {
                append("{")
                append("\"os\":").append(quoteJson(System.getProperty("os.name"))).append(",")
                append("\"coldStartMs\":").append(coldStartMs).append(",")
                append("\"perFixture\":{")
                append(perFixture.entries.joinToString(",") { "${quoteJson(it.key)}:${it.value}" })
                append("},")
                append("\"gen200FirstMs\":").append(gen200FirstMs).append(",")
                append("\"gen200SecondMs\":").append(gen200SecondMs).append(",")
                append("\"identical\":").append(identical).append(",")
                append("\"timerDelaysMs\":[").append(timers.joinToString(",")).append("]")
                append("}")
            }
        } finally {
            ApplicationManager.getApplication().invokeAndWait { browser.dispose() }
        }
    }

    private fun open(): JBCefBrowser {
        var opened: JBCefBrowser? = null
        ApplicationManager.getApplication().invokeAndWait { opened = create() }
        return opened ?: error("the hidden browser was not created")
    }

    private fun create(): JBCefBrowser {
        val browser = JBCefBrowser.createBuilder().setOffScreenRendering(true).build()
        browser.createImmediately()
        val jsQuery = JBCefJSQuery.create(browser)
        query = jsQuery
        jsQuery.addHandler { request ->
            deliver(request)
            null
        }
        val resources = SpikeResources(jsQuery.inject("request"), SpikeTheme.bodyClass())
        browser.jbCefClient.addRequestHandler(SpikeRequestHandler(resources), browser.cefBrowser)
        browser.loadURL(PAGE_URL)
        return browser
    }

    private fun call(browser: JBCefBrowser, input: String): Pair<String, Long> {
        val id = "call-${calls.incrementAndGet()}"
        val started = System.nanoTime()
        browser.cefBrowser.executeJavaScript("featherspecV2Run(${quoteJson(id)}, ${quoteJson(input)});", PAGE_URL, 0)
        val value = await(id, 180)
        return Pair(value, millisSince(started))
    }

    private fun deliver(request: String) {
        val parts = request.split(V2_SEPARATOR, limit = 3)
        if (parts.size != 3) return
        val reply = slot(parts[0])
        if (parts[1] == "ok") {
            reply.complete(parts[2])
        } else {
            reply.completeExceptionally(IllegalStateException(parts[2]))
        }
    }

    private fun slot(id: String): CompletableFuture<String> = replies.computeIfAbsent(id) { CompletableFuture<String>() }

    private fun await(id: String, seconds: Long): String {
        try {
            return slot(id).get(seconds, TimeUnit.SECONDS)
        } finally {
            replies.remove(id)
        }
    }

    private fun millisSince(startNanos: Long): Long = (System.nanoTime() - startNanos) / 1_000_000L

    private fun resourceText(path: String): String = resourceBytes(path).toString(Charsets.UTF_8)

    private fun resourceBytes(path: String): ByteArray =
        SpikeResources.readResource(path) ?: error("missing resource $path")

    companion object {
        const val PAGE_URL = "$SPIKE_ORIGIN/core.html"
    }
}

private fun quoteJson(text: String): String {
    val out = StringBuilder(text.length + 2).append('"')
    for (char in text) {
        when {
            char == '"' -> out.append("\\\"")
            char == '\\' -> out.append("\\\\")
            char == '\n' -> out.append("\\n")
            char == '\r' -> out.append("\\r")
            char == '\t' -> out.append("\\t")
            char < ' ' || char == ' ' || char == ' ' -> out.append("\\u%04x".format(char.code))
            else -> out.append(char)
        }
    }
    return out.append('"').toString()
}
