package com.gregorbiswanger.featherspec.studio.runtime

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class CoreDiagnosisTest {
    private val ms = 1_000_000L

    @Test
    fun `nothing happened names every step as no`() {
        assertEquals(
            "Diagnosis - browser created: no; core page loaded: no; config received: no; start sent: no; first frame from the core: no.",
            CoreDiagnosis.describe(0, 0, 0, 0, 0),
        )
    }

    @Test
    fun `a browser that never loaded the page and got no config is visible`() {
        val text = CoreDiagnosis.describe(1_000 * ms, 0, 0, 0, 0)
        assertEquals(
            "Diagnosis - browser created: yes; core page loaded: no; config received: no; start sent: no; first frame from the core: no.",
            text,
        )
    }

    @Test
    fun `steps carry their offset from the browser creation`() {
        val text = CoreDiagnosis.describe(1_000 * ms, 1_250 * ms, 1_100 * ms, 1_300 * ms, 0)
        assertEquals(
            "Diagnosis - browser created: yes; core page loaded: yes (+250 ms); config received: yes (+100 ms); start sent: yes (+300 ms); first frame from the core: no.",
            text,
        )
    }

    @Test
    fun `a config that arrived before the browser has a negative offset`() {
        val text = CoreDiagnosis.describe(2_000 * ms, 0, 1_900 * ms, 0, 0)
        assertEquals(true, text.contains("config received: yes (-100 ms)"))
    }
}
