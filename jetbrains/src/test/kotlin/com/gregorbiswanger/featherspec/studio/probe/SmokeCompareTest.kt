package com.gregorbiswanger.featherspec.studio.probe

import com.gregorbiswanger.featherspec.studio.theme.ContrastReport
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class SmokeCompareTest {
    private fun theme(want: ThemeWant, body: String = want.bodyClass, ms: Long = 100, contrast: ContrastReport = ContrastReport(20, emptyList(), emptyList())) =
        ThemeRecord(want.name, want.name, want.bodyClass, body, ms, 1, 0, emptyList(), contrast)

    private fun report(
        state: String = "loading",
        loading: Long = 40,
        first: Long = 9000,
        reopen: Long = 800,
        externalTree: Long = 1500,
        externalStatus: Long = -1,
        inIdeTree: Long = 100,
        inIdeStatus: Long = -1,
        inIdePanel: Long = 300,
        restoredArea: String = "board",
        restoredSelection: String = "0015-x",
        themes: List<ThemeRecord> = SmokeThemes.WANTED.map { theme(it) },
        files: FileChanges = FileChanges(listOf(SmokeFiles.EXTERNAL), listOf(SmokeFiles.EDITED), emptyList()),
    ): String =
        SmokeReport(
            "Linux", state, loading, first, reopen, externalTree, externalStatus, inIdeTree, inIdeStatus, inIdePanel,
            "board", "0015-x", restoredArea, restoredSelection, 700, themes, files, emptyList(),
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
        assertEquals(emptyList<String>(), SmokeCompare.smoke(report(loading = 1000, reopen = 1000, externalTree = 2000, inIdeTree = 500, inIdePanel = 500)))
        val over = SmokeCompare.smoke(report(loading = 1001, reopen = 1001, externalTree = 2001, inIdeTree = 501, inIdePanel = 501))
        assertEquals(5, over.size, over.toString())
    }

    @Test
    fun `a measurement that never happened is a problem for the required values`() {
        val problems = SmokeCompare.smoke(report(loading = -1, first = -1, reopen = -1, externalTree = -1, inIdeTree = -1, inIdePanel = -1))
        assertEquals(6, problems.size, problems.toString())
        assertTrue(problems.all { it.endsWith("was not observed") }, problems.toString())
    }

    @Test
    fun `the status entry counts only when it changed`() {
        assertEquals(emptyList<String>(), SmokeCompare.smoke(report(externalStatus = -1, inIdeStatus = -1)))
        assertEquals(emptyList<String>(), SmokeCompare.smoke(report(externalStatus = 1200, inIdeStatus = 200)))
        assertEquals(2, SmokeCompare.smoke(report(externalStatus = 2500, inIdeStatus = 900)).size)
    }

    @Test
    fun `a core that was ready before the tab opened is named`() {
        val problems = SmokeCompare.smoke(report(state = "ready"))
        assertEquals(1, problems.size)
        assertTrue(problems.single().contains("loading state could not be observed"))
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
        assertEquals(1, SmokeCompare.smoke(report(files = FileChanges(emptyList(), emptyList(), emptyList()))).size)
        assertEquals(1, SmokeCompare.smoke(report(files = FileChanges(listOf(SmokeFiles.EXTERNAL, "x.md"), emptyList(), emptyList()))).size)
        assertEquals(1, SmokeCompare.smoke(report(files = FileChanges(listOf(SmokeFiles.EXTERNAL), listOf("AGENTS.md"), emptyList()))).size)
        assertEquals(1, SmokeCompare.smoke(report(files = FileChanges(listOf(SmokeFiles.EXTERNAL), emptyList(), listOf("AGENTS.md")))).size)
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
