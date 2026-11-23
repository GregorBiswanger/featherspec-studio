package com.gregorbiswanger.featherspec.studio.probe

import com.google.gson.JsonParser
import com.gregorbiswanger.featherspec.studio.theme.ContrastReport
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class SmokeCompareTest {
    private fun theme(want: ThemeWant, body: String = want.bodyClass, ms: Long = 100, contrast: ContrastReport = ContrastReport(20, emptyList(), emptyList())) =
        ThemeRecord(want.name, want.name, want.bodyClass, body, ms, 1, 0, emptyList(), contrast)

    private fun report(
        os: String = "Linux",
        state: String = "loading",
        loading: Long = 40,
        first: Long = 9000,
        reopen: List<Long> = listOf(900, 800, 950),
        externalTree: Long = 1500,
        externalStatus: Long = 1200,
        inIdeTree: Long = 100,
        inIdeStatus: Long = 200,
        inIdePanel: Long = 300,
        restoredArea: String = "board",
        restoredSelection: String = "0015-x",
        themes: List<ThemeRecord> = SmokeThemes.WANTED.map { theme(it) },
        restore: List<Long> = listOf(700, 650, 990),
        files: FileChanges = FileChanges(listOf(SmokeFiles.EXTERNAL), listOf(SmokeFiles.EDITED), emptyList()),
    ): String =
        SmokeReport(
            os, state, loading, first, reopen, externalTree, externalStatus, inIdeTree, inIdeStatus, inIdePanel,
            "board", "0015-x", restoredArea, restoredSelection, restore, themes, files, emptyList(),
        ).toJson()

    @Test
    fun `a report within every budget has no difference`() {
        assertEquals(emptyList<String>(), SmokeCompare.smoke(report()))
        assertEquals(emptyList<String>(), SmokeCompare.themes(report()))
    }

    @Test
    fun `the budgets are the ones of the spec`() {
        assertEquals(1000L, SmokeBudgets.LOADING_MS)
        assertEquals(1000L, SmokeBudgets.FRAME_MS)
        assertEquals(2000L, SmokeBudgets.EXTERNAL_MS)
        assertEquals(500L, SmokeBudgets.IN_IDE_MS)
        assertEquals(500L, SmokeBudgets.THEME_MS)
    }

    @Test
    fun `a value on the budget passes and one millisecond over fails`() {
        assertEquals(
            emptyList<String>(),
            SmokeCompare.smoke(report(loading = 1000, reopen = listOf(1000, 1000, 1000), externalTree = 2000, externalStatus = 2000, inIdeTree = 500, inIdeStatus = 500, inIdePanel = 500, restore = listOf(1000, 1000, 1000))),
        )
        val over = SmokeCompare.smoke(
            report(loading = 1001, reopen = listOf(1001, 1001, 1001), externalTree = 2001, externalStatus = 2001, inIdeTree = 501, inIdeStatus = 501, inIdePanel = 501, restore = listOf(1001, 1001, 1001)),
        )
        assertEquals(8, over.size, over.toString())
    }

    @Test
    fun `on Windows the timings are a trend up to 1,49 times and every value reaches the rows`() {
        val rows = ArrayList<BudgetRow>()
        val trend = report(os = "Windows 11", loading = 1490, reopen = listOf(1490, 2000, 3000), externalTree = 2980, externalStatus = 100, inIdeTree = 745, inIdeStatus = 100, inIdePanel = 100, restore = listOf(1490, 1490, 1490))
        assertEquals(emptyList<String>(), SmokeCompare.smoke(trend, rows))
        assertEquals(8, rows.size)
        assertTrue(rows.all { it.os == "Windows 11" })
        assertEquals(Verdict.TREND, rows.first { it.name.startsWith("AC-007 loading") }.verdict)
        assertEquals(Verdict.PASSED, rows.first { it.name.contains("external change in the status") }.verdict)
        val red = SmokeCompare.smoke(report(os = "Mac OS X", loading = 1500, inIdePanel = 750))
        assertEquals(2, red.size, red.toString())
        assertEquals(emptyList<String>(), SmokeCompare.smoke(report(os = "Linux", loading = 1000), ArrayList()))
        assertEquals(1, SmokeCompare.smoke(report(os = "Linux", loading = 1001)).size)
    }

    @Test
    fun `on Windows the functional checks stay hard`() {
        assertEquals(1, SmokeCompare.smoke(report(os = "Windows 11", state = "loading", loading = -1)).size)
        assertEquals(1, SmokeCompare.smoke(report(os = "Windows 11", restoredArea = "overview")).size)
        assertEquals(1, SmokeCompare.smoke(report(os = "Windows 11", files = FileChanges(listOf(SmokeFiles.EXTERNAL), listOf(SmokeFiles.EDITED), listOf("AGENTS.md")))).size)
        assertEquals(1, SmokeCompare.smoke(report(os = "Windows 11", externalStatus = -1)).size)
        val themes = SmokeThemes.WANTED.map { theme(it, ms = 749) }
        assertEquals(emptyList<String>(), SmokeCompare.themes(report(os = "Windows 11", themes = themes)))
        val broken = listOf(theme(SmokeThemes.WANTED[0], body = "wrong", ms = 749)) + SmokeThemes.WANTED.drop(1).map { theme(it, ms = 749) }
        assertEquals(1, SmokeCompare.themes(report(os = "Windows 11", themes = broken)).size)
        val slow = SmokeThemes.WANTED.map { theme(it, ms = 750) }
        assertEquals(SmokeThemes.WANTED.size, SmokeCompare.themes(report(os = "Windows 11", themes = slow)).size)
    }

    @Test
    fun `a frame is judged by the best of three samples and every sample is recorded`() {
        assertEquals(emptyList<String>(), SmokeCompare.smoke(report(reopen = listOf(4000, 999, 5000), restore = listOf(1500, 3000, 800))))
        val slow = SmokeCompare.smoke(report(reopen = listOf(1100, 1200, 1001), restore = listOf(1100, 1200, 1300)))
        assertEquals(2, slow.size, slow.toString())
        assertTrue(slow[0].contains("took 1001 ms"), slow.toString())
        assertTrue(slow[1].contains("took 1100 ms"), slow.toString())
        val json = JsonParser.parseString(report(reopen = listOf(900, 800, 950), restore = listOf(700, 650, 990))).asJsonObject
        assertEquals(800L, json.get("reopenFrameMs").asLong)
        assertEquals(listOf(900L, 800L, 950L), json.getAsJsonArray("reopenFrameSamples").map { it.asLong })
        assertEquals(650L, json.get("restoreFrameMs").asLong)
        assertEquals(listOf(700L, 650L, 990L), json.getAsJsonArray("restoreFrameSamples").map { it.asLong })
    }

    @Test
    fun `a missed sample is skipped by the best, and fewer than three samples is a problem`() {
        assertEquals(emptyList<String>(), SmokeCompare.smoke(report(reopen = listOf(-1, 700, 900))))
        assertEquals(800L, SmokeReport.best(listOf(-1, 800, 900)))
        assertEquals(-1L, SmokeReport.best(listOf(-1, -1, -1)))
        assertEquals(-1L, SmokeReport.best(emptyList()))
        val problems = SmokeCompare.smoke(report(reopen = listOf(700, 800), restore = listOf(-1, -1, -1)))
        assertEquals(2, problems.size, problems.toString())
        assertTrue(problems.any { it.startsWith("frame after reopening: expected 3 samples, observed [700, 800]") }, problems.toString())
        assertTrue(problems.any { it.startsWith("frame after the restoring reopen (best of 3) was not observed") }, problems.toString())
    }

    @Test
    fun `a measurement that never happened is a problem for the required values`() {
        val problems = SmokeCompare.smoke(
            report(loading = -1, first = -1, reopen = listOf(-1, -1, -1), externalTree = -1, externalStatus = -1, inIdeTree = -1, inIdeStatus = -1, inIdePanel = -1),
        )
        assertEquals(8, problems.size, problems.toString())
        assertTrue(problems.all { it.endsWith("was not observed") }, problems.toString())
    }

    @Test
    fun `the status entry must change for the external and the in-IDE change`() {
        assertEquals(emptyList<String>(), SmokeCompare.smoke(report(externalStatus = 1200, inIdeStatus = 200)))
        val missing = SmokeCompare.smoke(report(externalStatus = -1, inIdeStatus = -1))
        assertEquals(2, missing.size, missing.toString())
        assertTrue(missing.any { it == "AC-021 external change in the status entry was not observed" }, missing.toString())
        assertTrue(missing.any { it == "AC-020 in-IDE change in the status entry was not observed" }, missing.toString())
        assertEquals(2, SmokeCompare.smoke(report(externalStatus = 2500, inIdeStatus = 900)).size)
    }

    @Test
    fun `the loading panel is judged only when the core was still loading as the tab opened`() {
        assertEquals(emptyList<String>(), SmokeCompare.smoke(report(state = "ready", loading = -1)))
        assertEquals(1, SmokeCompare.smoke(report(state = "loading", loading = -1)).size)
    }

    @Test
    fun `a lost area or selection is named with both values`() {
        val problems = SmokeCompare.smoke(report(restoredArea = "overview", restoredSelection = ""))
        assertEquals(2, problems.size, problems.toString())
        assertTrue(problems[0].contains("expected 'board', observed 'overview'"))
        assertTrue(problems[1].contains("expected '0015-x', observed ''"))
    }

    @Test
    fun `a file the test did not write is a problem`() {
        assertEquals(2, SmokeCompare.smoke(report(files = FileChanges(emptyList(), emptyList(), emptyList()))).size)
        assertEquals(1, SmokeCompare.smoke(report(files = FileChanges(listOf(SmokeFiles.EXTERNAL), emptyList(), emptyList()))).size)
        assertEquals(1, SmokeCompare.smoke(report(files = FileChanges(listOf(SmokeFiles.EXTERNAL, "x.md"), listOf(SmokeFiles.EDITED), emptyList()))).size)
        assertEquals(1, SmokeCompare.smoke(report(files = FileChanges(listOf(SmokeFiles.EXTERNAL), listOf("AGENTS.md"), emptyList()))).size)
        assertEquals(1, SmokeCompare.smoke(report(files = FileChanges(listOf(SmokeFiles.EXTERNAL), listOf(SmokeFiles.EDITED, "AGENTS.md"), emptyList()))).size)
        assertEquals(1, SmokeCompare.smoke(report(files = FileChanges(listOf(SmokeFiles.EXTERNAL), listOf(SmokeFiles.EDITED), listOf("AGENTS.md")))).size)
    }

    @Test
    fun `a wrong body class, a slow switch or a missing theme is named`() {
        val themes = SmokeThemes.WANTED.map { theme(it) }.toMutableList()
        themes[0] = theme(SmokeThemes.WANTED[0], body = "vscode-dark")
        themes[1] = theme(SmokeThemes.WANTED[1], ms = 501)
        val problems = SmokeCompare.themes(report(themes = themes.dropLast(1)))
        assertEquals(4, problems.size, problems.toString())
        assertTrue(problems.any { it.startsWith("themes: expected 5 records") })
        assertTrue(problems.any { it.startsWith("Light: body class expected vscode-light, observed 'vscode-dark'") })
        assertTrue(problems.any { it.startsWith("AC-028 Darcula switch took 501 ms") })
        assertTrue(problems.any { it == "Islands Dark: no record" })
    }

    @Test
    fun `contrast failures and a theme the IDE lacks are named`() {
        val failing = ContrastReport(20, listOf("--a on --b: 2.00 is below 4.5"), emptyList())
        val themes = SmokeThemes.WANTED.map { theme(it) }.toMutableList()
        themes[2] = theme(SmokeThemes.WANTED[2], contrast = failing)
        themes[3] = theme(SmokeThemes.WANTED[3]).copy(found = "")
        val problems = SmokeCompare.themes(report(themes = themes))
        assertEquals(2, problems.size, problems.toString())
        assertTrue(problems.any { it == "AC-029 High Contrast: --a on --b: 2.00 is below 4.5" })
        assertTrue(problems.any { it == "Islands Light: the IDE has no such theme" })
    }

    @Test
    fun `an update with a missing variable or an unseen script is named`() {
        val themes = SmokeThemes.WANTED.map { theme(it) }.toMutableList()
        themes[0] = theme(SmokeThemes.WANTED[0]).copy(scripts = 0)
        themes[1] = theme(SmokeThemes.WANTED[1]).copy(incompleteScripts = 1, missingVariables = listOf("--vscode-foreground"))
        val problems = SmokeCompare.themes(report(themes = themes))
        assertEquals(3, problems.size, problems.toString())
        assertTrue(problems.any { it == "Light: no update script reached the panel" })
        assertTrue(problems.any { it.startsWith("Darcula: 1 update script(s) lacked") })
        assertTrue(problems.any { it.startsWith("Darcula: variables missing from the update: [--vscode-foreground]") })
    }

    @Test
    fun `text that is no JSON object is one problem`() {
        assertEquals(listOf("the probe wrote no JSON object"), SmokeCompare.smoke("nope"))
        assertEquals(listOf("the probe wrote no JSON object"), SmokeCompare.themes("[]"))
    }
}
