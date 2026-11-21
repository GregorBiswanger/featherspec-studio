package com.gregorbiswanger.featherspec.studio.probe

import org.junit.jupiter.api.Assertions
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class BudgetsTest {
    private val within = Budgets(11_999, 1_999, 999, 800, 123_456)

    @Test
    fun `values at the edge of the limits pass`() {
        assertEquals(emptyList<String>(), within.violations())
        assertEquals(emptyList<String>(), within.copy(coreReadyMs = 12_000).violations())
    }

    @Test
    fun `core ready above 12000 is a violation`() {
        val found = within.copy(coreReadyMs = 12_001).violations()
        assertEquals(1, found.size)
        assertTrue(found[0].startsWith("coreReadyMs 12001"))
    }

    @Test
    fun `read at 2000 and update at 1000 are violations`() {
        assertEquals(1, within.copy(gen200ReadMs = 2_000).violations().size)
        assertEquals(1, within.copy(gen200UpdateMs = 1_000).violations().size)
    }

    @Test
    fun `a value that was not measured is a violation`() {
        assertEquals(
            listOf("coreReadyMs was not measured", "gen200ReadMs was not measured", "gen200UpdateMs was not measured"),
            within.copy(coreReadyMs = -1, gen200ReadMs = -1, gen200UpdateMs = -1).violations(),
        )
    }

    @Test
    fun `warm start and heap are recorded but never judged`() {
        assertEquals(emptyList<String>(), within.copy(coreReadyWarmMs = 600_000, jsHeapBytes = null).violations())
    }

    @Test
    fun `json round trip keeps every field`() {
        assertEquals(within, Budgets.parse(within.toJson()))
        val noHeap = within.copy(jsHeapBytes = null)
        assertTrue(noHeap.toJson().contains("\"jsHeapBytes\":null"))
        assertNull(Budgets.parse(noHeap.toJson()).jsHeapBytes)
    }

    @Test
    fun `a missing field is reported`() {
        val failure = Assertions.assertThrows(IllegalArgumentException::class.java) { Budgets.parse("{\"coreReadyMs\":1}") }
        assertTrue(failure.message!!.contains("gen200ReadMs"))
    }
}
