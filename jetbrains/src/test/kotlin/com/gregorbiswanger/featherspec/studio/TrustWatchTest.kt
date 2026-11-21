package com.gregorbiswanger.featherspec.studio

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class TrustWatchTest {
    @Test
    fun `AC-019 a grant is reported once`() {
        val watch = TrustWatch(false)
        assertFalse(watch.grantedNow(false))
        assertTrue(watch.grantedNow(true))
        assertFalse(watch.grantedNow(true))
    }

    @Test
    fun `a project that starts trusted reports nothing`() {
        val watch = TrustWatch(true)
        assertFalse(watch.grantedNow(true))
    }

    @Test
    fun `a revoked and granted project reports again`() {
        val watch = TrustWatch(true)
        assertFalse(watch.grantedNow(false))
        assertTrue(watch.grantedNow(true))
    }

    @Test
    fun `the trust event is the one the core page applies`() {
        assertEquals("trustGranted", TrustWatch.EVENT)
        assertEquals("{}", TrustWatch.PAYLOAD)
        assertTrue(TrustWatch.HELP_URL.startsWith("https://"))
    }
}
