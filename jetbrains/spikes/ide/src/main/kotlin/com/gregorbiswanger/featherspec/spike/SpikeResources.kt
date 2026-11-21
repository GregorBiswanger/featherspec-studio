package com.gregorbiswanger.featherspec.spike

import org.cef.browser.CefBrowser
import org.cef.browser.CefFrame
import org.cef.callback.CefCallback
import org.cef.handler.CefRequestHandlerAdapter
import org.cef.handler.CefResourceHandler
import org.cef.handler.CefResourceHandlerAdapter
import org.cef.handler.CefResourceRequestHandler
import org.cef.handler.CefResourceRequestHandlerAdapter
import org.cef.misc.BoolRef
import org.cef.misc.IntRef
import org.cef.misc.StringRef
import org.cef.network.CefRequest
import org.cef.network.CefResponse
import java.util.UUID

const val SPIKE_ORIGIN = "https://studio.featherspec.invalid"

class SpikeResource(val mimeType: String, val bytes: ByteArray)

class SpikeResources(private val postRequest: String, private val themeClass: String) {
    fun load(url: String): SpikeResource? {
        if (!url.startsWith(SPIKE_ORIGIN)) {
            return null
        }
        return when (url.removePrefix(SPIKE_ORIGIN).substringBefore('?')) {
            "/index.html" -> SpikeResource("text/html", spikeHtml(newNonce(), themeClass, postRequest).toByteArray(Charsets.UTF_8))
            "/main.js" -> file("main.js", "text/javascript")
            "/main.css" -> file("main.css", "text/css")
            "/theme.css" -> SpikeResource("text/css", SpikeTheme.css().toByteArray(Charsets.UTF_8))
            "/core.html" -> SpikeResource("text/html", coreHtml(newNonce(), postRequest).toByteArray(Charsets.UTF_8))
            "/core-spike.js" -> file("graal/core-spike.js", "text/javascript")
            else -> null
        }
    }

    private fun file(name: String, mimeType: String): SpikeResource? {
        return readResource(name)?.let { SpikeResource(mimeType, it) }
    }

    private fun newNonce(): String = UUID.randomUUID().toString().replace("-", "")

    companion object {
        fun readResource(name: String): ByteArray? {
            return SpikeResources::class.java.getResourceAsStream("/$name")?.use { it.readBytes() }
        }
    }
}

fun spikeHtml(nonce: String, themeClass: String, postRequest: String): String {
    val policy = listOf(
        "default-src 'none'",
        "style-src $SPIKE_ORIGIN",
        "script-src 'nonce-$nonce'",
        "img-src $SPIKE_ORIGIN data:",
        "font-src $SPIKE_ORIGIN",
    ).joinToString("; ")
    val shim = "(function () { " +
        "var post = function (request) { $postRequest }; " +
        "window.acquireVsCodeApi = function () { return { postMessage: function (message) { post(JSON.stringify(message)); } }; }; " +
        "document.body.className = '$themeClass'; " +
        "})();"
    return listOf(
        "<!DOCTYPE html>",
        "<html lang=\"en\">",
        "<head>",
        "<meta charset=\"UTF-8\">",
        "<meta http-equiv=\"Content-Security-Policy\" content=\"$policy\">",
        "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">",
        "<title>FeatherSpec Studio</title>",
        "<link rel=\"stylesheet\" href=\"$SPIKE_ORIGIN/theme.css\">",
        "<link rel=\"stylesheet\" href=\"$SPIKE_ORIGIN/main.css\">",
        "</head>",
        "<body data-reloaded=\"false\" data-test=\"false\">",
        "<div id=\"root\"></div>",
        "<script nonce=\"$nonce\">$shim</script>",
        "<script nonce=\"$nonce\" src=\"$SPIKE_ORIGIN/main.js\"></script>",
        "</body>",
        "</html>",
        "",
    ).joinToString("\n")
}

class SpikeRequestHandler(private val resources: SpikeResources) : CefRequestHandlerAdapter() {
    override fun onBeforeBrowse(browser: CefBrowser?, frame: CefFrame?, request: CefRequest?, userGesture: Boolean, isRedirect: Boolean): Boolean {
        return request?.url?.startsWith(SPIKE_ORIGIN) != true
    }

    override fun getResourceRequestHandler(
        browser: CefBrowser?,
        frame: CefFrame?,
        request: CefRequest?,
        isNavigation: Boolean,
        isDownload: Boolean,
        requestInitiator: String?,
        disableDefaultHandling: BoolRef?,
    ): CefResourceRequestHandler? {
        return SpikeResourceRequestHandler(resources)
    }
}

private class SpikeResourceRequestHandler(private val resources: SpikeResources) : CefResourceRequestHandlerAdapter() {
    override fun onBeforeResourceLoad(browser: CefBrowser?, frame: CefFrame?, request: CefRequest?): Boolean {
        return request?.url?.startsWith(SPIKE_ORIGIN) != true
    }

    override fun getResourceHandler(browser: CefBrowser?, frame: CefFrame?, request: CefRequest?): CefResourceHandler? {
        val resource = request?.url?.let { resources.load(it) } ?: return null
        return SpikeResourceHandler(resource)
    }
}

private class SpikeResourceHandler(private val resource: SpikeResource) : CefResourceHandlerAdapter() {
    private var offset = 0

    override fun processRequest(request: CefRequest?, callback: CefCallback?): Boolean {
        callback?.Continue()
        return true
    }

    override fun getResponseHeaders(response: CefResponse?, responseLength: IntRef?, redirectUrl: StringRef?) {
        response?.status = 200
        response?.mimeType = resource.mimeType
        responseLength?.set(resource.bytes.size)
    }

    override fun readResponse(dataOut: ByteArray?, bytesToRead: Int, bytesRead: IntRef?, callback: CefCallback?): Boolean {
        val remaining = resource.bytes.size - offset
        if (dataOut == null || remaining <= 0) {
            bytesRead?.set(0)
            return false
        }
        val count = minOf(remaining, bytesToRead)
        System.arraycopy(resource.bytes, offset, dataOut, 0, count)
        offset += count
        bytesRead?.set(count)
        return true
    }
}
