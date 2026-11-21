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

class PluginRequestHandler(private val coreHtml: () -> String) : CefRequestHandlerAdapter() {
    override fun onBeforeBrowse(browser: CefBrowser?, frame: CefFrame?, request: CefRequest?, userGesture: Boolean, isRedirect: Boolean): Boolean {
        return isBlocked(request)
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
        return PluginResourceRequestHandler(coreHtml)
    }
}

private fun isBlocked(request: CefRequest?): Boolean {
    val url = request?.url ?: return true
    return PluginResources.resolve(url) == null
}

private class PluginResourceRequestHandler(private val coreHtml: () -> String) : CefResourceRequestHandlerAdapter() {
    override fun onBeforeResourceLoad(browser: CefBrowser?, frame: CefFrame?, request: CefRequest?): Boolean {
        return isBlocked(request)
    }

    override fun getResourceHandler(browser: CefBrowser?, frame: CefFrame?, request: CefRequest?): CefResourceHandler? {
        val resource = request?.url?.let { PluginResources.resolve(it) } ?: return null
        val bytes = bytesOf(resource) ?: return null
        return PluginResourceHandler(bytes, resource.mimeType)
    }

    private fun bytesOf(resource: Resource): ByteArray? {
        if (resource.path == "core.html") {
            return coreHtml().toByteArray(Charsets.UTF_8)
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
