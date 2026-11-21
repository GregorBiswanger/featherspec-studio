package com.gregorbiswanger.featherspec.studio.jcef

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

class PluginRequestHandler(private val documents: Map<String, () -> String>) : CefRequestHandlerAdapter() {
    constructor(coreHtml: () -> String) : this(mapOf<String, () -> String>("core.html" to coreHtml))

    override fun onBeforeBrowse(browser: CefBrowser?, frame: CefFrame?, request: CefRequest?, userGesture: Boolean, isRedirect: Boolean): Boolean {
        return isBlocked(request, documents)
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
        return PluginResourceRequestHandler(documents)
    }
}

private fun isBlocked(request: CefRequest?, documents: Map<String, () -> String>): Boolean {
    val url = request?.url ?: return true
    val resource = PluginResources.resolve(url) ?: return true
    return resource.path in PluginResources.documentPaths && resource.path !in documents
}

private class PluginResourceRequestHandler(private val documents: Map<String, () -> String>) : CefResourceRequestHandlerAdapter() {
    override fun onBeforeResourceLoad(browser: CefBrowser?, frame: CefFrame?, request: CefRequest?): Boolean {
        return isBlocked(request, documents)
    }

    override fun getResourceHandler(browser: CefBrowser?, frame: CefFrame?, request: CefRequest?): CefResourceHandler? {
        val resource = request?.url?.let { PluginResources.resolve(it) } ?: return null
        val bytes = bytesOf(resource) ?: return null
        return PluginResourceHandler(bytes, resource.mimeType)
    }

    private fun bytesOf(resource: Resource): ByteArray? {
        val document = documents[resource.path]
        if (document != null) {
            return document().toByteArray(Charsets.UTF_8)
        }
        return PluginRequestHandler::class.java.getResourceAsStream("/${resource.path}")?.use { it.readBytes() }
    }
}

private class PluginResourceHandler(private val bytes: ByteArray, private val mimeType: String) : CefResourceHandlerAdapter() {
    private var offset = 0

    override fun processRequest(request: CefRequest?, callback: CefCallback?): Boolean {
        callback?.Continue()
        return true
    }

    override fun getResponseHeaders(response: CefResponse?, responseLength: IntRef?, redirectUrl: StringRef?) {
        response?.status = 200
        response?.mimeType = mimeType
        responseLength?.set(bytes.size)
    }

    override fun readResponse(dataOut: ByteArray?, bytesToRead: Int, bytesRead: IntRef?, callback: CefCallback?): Boolean {
        val remaining = bytes.size - offset
        if (dataOut == null || remaining <= 0) {
            bytesRead?.set(0)
            return false
        }
        val count = minOf(remaining, bytesToRead)
        System.arraycopy(bytes, offset, dataOut, 0, count)
        offset += count
        bytesRead?.set(count)
        return true
    }
}
