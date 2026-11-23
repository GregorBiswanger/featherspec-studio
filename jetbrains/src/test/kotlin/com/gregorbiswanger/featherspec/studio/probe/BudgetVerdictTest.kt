package com.gregorbiswanger.featherspec.studio.probe

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class BudgetVerdictTest {
    private fun verdict(os: String, ms: Long, budget: Long = 12_000, exclusive: Boolean = false) =
        BudgetVerdict.judge("check", ms, budget, os, exclusive).verdict

    @Test
    fun `Linux is a hard gate at the budget`() {
        assertEquals(Verdict.PASSED, verdict("Linux", 12_000))
        assertEquals(Verdict.FAILED, verdict("Linux", 12_001))
        assertEquals(Verdict.FAILED, verdict("Linux", 17_880))
        assertEquals(12_000L, BudgetVerdict.judge("check", 1, 12_000, "Linux").limit)
    }

    @Test
    fun `a budget that is below the value fails on the value itself`() {
        assertEquals(Verdict.PASSED, verdict("Linux", 1_999, 2_000, true))
        assertEquals(Verdict.FAILED, verdict("Linux", 2_000, 2_000, true))
    }

    @Test
    fun `Windows and macOS are a trend up to 1,49 times the budget`() {
        listOf("Windows 11", "Mac OS X").forEach { os ->
            assertEquals(Verdict.PASSED, verdict(os, 12_000))
            assertEquals(Verdict.TREND, verdict(os, 12_001))
            assertEquals(Verdict.TREND, verdict(os, 17_880))
            assertEquals(18_000L, BudgetVerdict.judge("check", 1, 12_000, os).limit)
        }
    }

    @Test
    fun `from 1,5 times the budget Windows and macOS fail`() {
        assertEquals(Verdict.FAILED, verdict("Windows Server 2025", 18_000))
        assertEquals(Verdict.FAILED, verdict("Mac OS X", 30_000))
        assertEquals(Verdict.TREND, verdict("Windows 11", 2_999, 2_000, true))
        assertEquals(Verdict.FAILED, verdict("Windows 11", 3_000, 2_000, true))
    }

    @Test
    fun `a value that was not measured fails on every system`() {
        listOf("Linux", "Windows 11", "Mac OS X", "").forEach { os ->
            val row = BudgetVerdict.judge("core ready", -1, 12_000, os)
            assertEquals(Verdict.FAILED, row.verdict)
            assertEquals("core ready was not observed", BudgetVerdict.problem(row))
        }
    }

    @Test
    fun `an unknown system is judged as hard`() {
        assertEquals(Verdict.FAILED, verdict("Plan 9", 12_001))
        assertEquals(Verdict.FAILED, verdict("", 12_001))
    }

    @Test
    fun `only a failed row is a problem`() {
        assertNull(BudgetVerdict.problem(BudgetVerdict.judge("a", 12_500, 12_000, "Windows 11")))
        assertNull(BudgetVerdict.problem(BudgetVerdict.judge("a", 100, 12_000, "Linux")))
        assertEquals("a took 12001 ms, the budget is 12000 ms", BudgetVerdict.problem(BudgetVerdict.judge("a", 12_001, 12_000, "Linux")))
        assertTrue(BudgetVerdict.problem(BudgetVerdict.judge("a", 18_000, 12_000, "Windows 11"))!!.contains("limit on Windows 11 is 18000"))
    }

    @Test
    fun `the table lists every value, also a green one`() {
        val rows = listOf(
            BudgetVerdict.judge("fast", 100, 1_000, "Windows 11"),
            BudgetVerdict.judge("slow", 1_200, 1_000, "Windows 11"),
            BudgetVerdict.judge("broken", 1_600, 1_000, "Windows 11"),
            BudgetVerdict.judge("missing", -1, 1_000, "Windows 11"),
        )
        val table = BudgetVerdict.table("Panel", rows)
        assertTrue(table.startsWith("### Panel\n\n| Check | Measured (ms) | Budget (ms) | Limit (ms) | OS | Result |"))
        assertTrue(table.contains("| fast | 100 | 1000 | 1500 | Windows 11 | passed |"))
        assertTrue(table.contains("| slow | 1200 | 1000 | 1500 | Windows 11 | trend |"))
        assertTrue(table.contains("| broken | 1600 | 1000 | 1500 | Windows 11 | failed |"))
        assertTrue(table.contains("| missing | not observed | 1000 | 1500 | Windows 11 | failed |"))
    }
}
