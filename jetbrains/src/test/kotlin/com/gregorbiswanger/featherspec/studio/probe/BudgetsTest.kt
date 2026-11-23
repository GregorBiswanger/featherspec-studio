package com.gregorbiswanger.featherspec.studio.probe

import org.junit.jupiter.api.Assertions
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class BudgetsTest {
    private val within = Budgets(
        coreReadyMs = 11_999,
        coreCreateMs = 3_000,
        coreLoadMs = 4_000,
        gen200ReadMs = 1_999,
        gen200UpdateMs = 999,
        gen200HarnessMs = 4_500,
        discover5Ms = 1_999,
        coreReadyWarmMs = 800,
        jsHeapBytes = 123_456,
    )

    @Test
    fun `values at the edge of the limits pass`() {
        assertEquals(emptyList<String>(), within.violations())
        assertEquals(emptyList<String>(), within.copy(coreReadyMs = 12_000).violations())
    }

    @Test
    fun `on Windows and macOS the budgets are a trend and every value reaches the rows`() {
        val rows = ArrayList<BudgetRow>()
        val slow = within.copy(coreReadyMs = 17_880, gen200ReadMs = 2_999, gen200UpdateMs = 1_499, discover5Ms = 2_000)
        assertEquals(emptyList<String>(), slow.violations("Windows 11", rows))
        assertEquals(4, rows.size)
        assertEquals(listOf(Verdict.TREND, Verdict.TREND, Verdict.TREND, Verdict.TREND), rows.map { it.verdict })
        assertEquals(1, within.copy(coreReadyMs = 18_000).violations("Mac OS X").size)
        assertEquals(1, within.copy(gen200ReadMs = 3_000).violations("Windows 11").size)
        assertEquals(1, within.copy(gen200UpdateMs = 1_500).violations("Windows 11").size)
        assertEquals(4, within.copy(coreReadyMs = -1, gen200ReadMs = -1, gen200UpdateMs = -1, discover5Ms = -1).violations("Windows 11").size)
        assertEquals(1, within.copy(coreReadyMs = 12_001).violations("Linux").size)
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
    fun `discovery of five roots at 2000 is a violation and below passes`() {
        val found = within.copy(discover5Ms = 2_000).violations()
        assertEquals(1, found.size)
        assertTrue(found[0].startsWith("discover5Ms 2000"))
        assertEquals(emptyList<String>(), within.copy(discover5Ms = 0).violations())
    }

    @Test
    fun `a value that was not measured is a violation`() {
        assertEquals(
            listOf("coreReadyMs was not measured", "gen200ReadMs was not measured", "gen200UpdateMs was not measured", "discover5Ms was not measured"),
            within.copy(coreReadyMs = -1, gen200ReadMs = -1, gen200UpdateMs = -1, discover5Ms = -1).violations(),
        )
    }

    @Test
    fun `warm start, startup breakdown, harness time and heap are recorded but never judged`() {
        assertEquals(
            emptyList<String>(),
            within.copy(coreReadyWarmMs = 600_000, coreCreateMs = -1, coreLoadMs = 600_000, gen200HarnessMs = 600_000, jsHeapBytes = null).violations(),
        )
    }

    @Test
    fun `elapsed milliseconds between two nanosecond marks, or minus one when a mark is missing`() {
        assertEquals(1_500L, Budgets.elapsedMs(1_000_000_000L, 2_500_000_000L))
        assertEquals(-1L, Budgets.elapsedMs(0L, 2_500_000_000L))
        assertEquals(-1L, Budgets.elapsedMs(1_000_000_000L, 0L))
    }

    @Test
    fun `json round trip keeps every field`() {
        assertEquals(within, Budgets.parse(within.toJson()))
        val noHeap = within.copy(jsHeapBytes = null)
        assertTrue(noHeap.toJson().contains("\"jsHeapBytes\":null"))
        assertTrue(within.toJson().contains("\"gen200HarnessMs\":4500"))
        assertTrue(within.toJson().contains("\"coreCreateMs\":3000"))
        assertTrue(within.toJson().contains("\"discover5Ms\":1999"))
        assertNull(Budgets.parse(noHeap.toJson()).jsHeapBytes)
    }

    @Test
    fun `a missing field is reported`() {
        val failure = Assertions.assertThrows(IllegalArgumentException::class.java) { Budgets.parse("{\"coreReadyMs\":1}") }
        assertTrue(failure.message!!.contains("coreCreateMs"))
    }
}
