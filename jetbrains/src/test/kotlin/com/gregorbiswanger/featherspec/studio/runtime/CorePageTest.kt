package com.gregorbiswanger.featherspec.studio.runtime

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class CorePageTest {
    private val nonce = "abc123"
    private val html = CorePage.html(nonce, "post(frame);")

    @Test
    fun `AC-015 the core url is on the plugin origin`() {
        assertEquals("https://studio.featherspec.invalid/core.html", CORE_URL)
        assertEquals("https://studio.featherspec.invalid", CORE_ORIGIN)
    }

    @Test
    fun `AC-015 the page starts with the doctype and carries the exact content security policy`() {
        assertTrue(html.startsWith("<!DOCTYPE html>"))
        assertTrue(
            html.contains("<meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'; script-src 'nonce-abc123'\">"),
            html,
        )
    }

    @Test
    fun `AC-015 the inline script comes before the core script and both carry the nonce`() {
        val inline = html.indexOf("<script nonce=\"abc123\">window.__featherspecNative = function (frame) { post(frame); };</script>")
        val core = html.indexOf("<script nonce=\"abc123\" src=\"https://studio.featherspec.invalid/core.js\"></script>")
        assertTrue(inline >= 0, html)
        assertTrue(core > inline, html)
    }

    @Test
    fun `AC-015 the page holds exactly two scripts and no other resource`() {
        assertEquals(2, Regex("<script").findAll(html).count())
        assertEquals(2, Regex("nonce=\"abc123\"").findAll(html).count())
        assertEquals(0, Regex("<link|<img|<style|<iframe").findAll(html).count())
        assertEquals(1, Regex("src=").findAll(html).count())
    }

    @Test
    fun `AC-015 another nonce changes both script tags and the policy`() {
        val other = CorePage.html("zzz", "x();")
        assertTrue(other.contains("'nonce-zzz'"))
        assertEquals(3, Regex("zzz").findAll(other).count())
        assertEquals(0, Regex("abc123").findAll(other).count())
    }
}
