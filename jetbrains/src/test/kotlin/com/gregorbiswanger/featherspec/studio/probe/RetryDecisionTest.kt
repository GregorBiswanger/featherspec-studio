package com.gregorbiswanger.featherspec.studio.probe

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class RetryDecisionTest {
    private val os = "Linux"

    private fun row(name: String, measured: Long, budget: Long = 1_000, system: String = os) =
        BudgetVerdict.judge(name, measured, budget, system)

    private fun problems(rows: List<BudgetRow>, vararg functional: String): List<String> =
        rows.mapNotNull { BudgetVerdict.problem(it) } + functional

    @Test
    fun `a time budget that missed is a time problem, a value that was not observed is not`() {
        val rows = listOf(row("fast", 100), row("slow", 1_200), row("missing", -1))
        assertEquals(listOf("slow took 1200 ms, the budget is 1000 ms"), RetryDecision.timeProblems(rows))
    }

    @Test
    fun `only time budgets missed repeats on Linux`() {
        val rows = listOf(row("loading", 1_900), row("frame", 700), row("tree", 2_500, 2_000))
        assertTrue(RetryDecision.onlyTimeBudgetsMissed(problems(rows), rows))
        assertTrue(RetryDecision.shouldRepeat("Linux", 1, problems(rows), rows))
    }

    @Test
    fun `a functional problem next to a time miss stops without repeat`() {
        val rows = listOf(row("loading", 1_900))
        val all = problems(rows, "AC-025 files deleted from the project: [a.md]")
        assertFalse(RetryDecision.onlyTimeBudgetsMissed(all, rows))
        assertFalse(RetryDecision.shouldRepeat("Linux", 1, all, rows))
    }

    @Test
    fun `a value that was not observed is functional and stops without repeat`() {
        val rows = listOf(row("frame", -1))
        assertFalse(RetryDecision.shouldRepeat("Linux", 1, problems(rows), rows))
    }

    @Test
    fun `a probe error or a log problem alone is functional`() {
        val rows = listOf(row("frame", 100))
        assertFalse(RetryDecision.shouldRepeat("Linux", 1, listOf("the probe failed: boom"), rows))
        assertFalse(RetryDecision.shouldRepeat("Linux", 1, listOf("idea.log x: ERROR"), emptyList()))
    }

    @Test
    fun `a green run is not repeated`() {
        val rows = listOf(row("frame", 100))
        assertFalse(RetryDecision.shouldRepeat("Linux", 1, emptyList(), rows))
    }

    @Test
    fun `the repeat happens once, the second run decides`() {
        val rows = listOf(row("loading", 1_900))
        assertTrue(RetryDecision.shouldRepeat("Linux", 1, problems(rows), rows))
        assertFalse(RetryDecision.shouldRepeat("Linux", 2, problems(rows), rows))
        assertEquals(2, RetryDecision.MAX_RUNS)
    }

    @Test
    fun `Windows and macOS never repeat, also not on a time miss`() {
        listOf("Windows 11", "Mac OS X", "Plan 9", "").forEach { system ->
            val rows = listOf(row("loading", 3_000, 1_000, system))
            assertFalse(RetryDecision.shouldRepeat(system, 1, problems(rows), rows), system)
        }
        assertTrue(RetryDecision.isLinux("Linux"))
        assertFalse(RetryDecision.isLinux("Windows 11"))
    }

    @Test
    fun `the job summary names both runs`() {
        assertEquals("Panel timings (Linux), run 1 of 2, repeated because only time budgets missed", RetryDecision.title("Panel timings (Linux)", 1, true))
        assertEquals("Panel timings (Linux)", RetryDecision.title("Panel timings (Linux)", 1, false))
        assertEquals("Panel timings (Linux), run 2 of 2 (repeat, decides)", RetryDecision.title("Panel timings (Linux)", 2, false))
    }
}
