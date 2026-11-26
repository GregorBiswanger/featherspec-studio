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
        own: Long = 5,
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
        trace: OpenTrace = OpenTrace(1000, 1000 + own, -1, -1, emptyList()),
    ): String =
        SmokeReport(
            os, state, loading, first, reopen, externalTree, externalStatus, inIdeTree, inIdeStatus, inIdePanel,
            "board", "0015-x", restoredArea, restoredSelection, restore, themes, files, emptyList(), trace,
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
            SmokeCompare.smoke(report(own = 1000, reopen = listOf(1000, 1000, 1000), externalTree = 2000, externalStatus = 2000, inIdeTree = 500, inIdeStatus = 500, inIdePanel = 500, restore = listOf(1000, 1000, 1000))),
        )
        val over = SmokeCompare.smoke(
            report(own = 1001, reopen = listOf(1001, 1001, 1001), externalTree = 2001, externalStatus = 2001, inIdeTree = 501, inIdeStatus = 501, inIdePanel = 501, restore = listOf(1001, 1001, 1001)),
        )
        assertEquals(8, over.size, over.toString())
    }

    @Test
    fun `on Windows the timings are a trend up to 1,49 times and every value reaches the rows`() {
        val rows = ArrayList<BudgetRow>()
        val trend = report(os = "Windows 11", own = 1490, reopen = listOf(1490, 2000, 3000), externalTree = 2980, externalStatus = 100, inIdeTree = 745, inIdeStatus = 100, inIdePanel = 100, restore = listOf(1490, 1490, 1490))
        assertEquals(emptyList<String>(), SmokeCompare.smoke(trend, rows))
        assertEquals(8, rows.count { it.verdict != Verdict.INFO })
        assertTrue(rows.all { it.os == "Windows 11" })
        assertEquals(Verdict.TREND, rows.first { it.name.startsWith("AC-007 loading") }.verdict)
        assertEquals(Verdict.PASSED, rows.first { it.name.contains("external change in the status") }.verdict)
        val red = SmokeCompare.smoke(report(os = "Mac OS X", own = 1500, inIdePanel = 750))
        assertEquals(2, red.size, red.toString())
        assertEquals(emptyList<String>(), SmokeCompare.smoke(report(os = "Linux", own = 1000), ArrayList()))
        assertEquals(1, SmokeCompare.smoke(report(os = "Linux", own = 1001)).size)
    }

    @Test
    fun `on Windows the functional checks stay hard`() {
        assertEquals(1, SmokeCompare.smoke(report(os = "Windows 11", state = "loading", trace = OpenTrace.NONE)).size)
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
            report(loading = -1, trace = OpenTrace.NONE, first = -1, reopen = listOf(-1, -1, -1), externalTree = -1, externalStatus = -1, inIdeTree = -1, inIdeStatus = -1, inIdePanel = -1),
        )
        assertEquals(8, problems.size, problems.toString())
        assertTrue(problems.all { it.contains("was not observed") }, problems.toString())
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
        assertEquals(emptyList<String>(), SmokeCompare.smoke(report(state = "ready", loading = -1, trace = OpenTrace.NONE)))
        val rows = ArrayList<BudgetRow>()
        SmokeCompare.smoke(report(state = "ready", loading = -1, trace = OpenTrace.NONE), rows)
        assertTrue(rows.none { it.name.startsWith("AC-007 loading") }, rows.toString())
        assertEquals(1, SmokeCompare.smoke(report(state = "loading", trace = OpenTrace.NONE)).size)
    }

    @Test
    fun `the loading panel is judged from the editor to the placeholder and the IDE part is only shown`() {
        val rows = ArrayList<BudgetRow>()
        val slowIde = OpenTrace(3995, 4000, -1, -1, emptyList())
        assertEquals(emptyList<String>(), SmokeCompare.smoke(report(os = "Linux", loading = 4000, trace = slowIde), rows))
        val judged = rows.single { it.name == SmokeCompare.LOADING_ROW }
        assertEquals(5L, judged.measured)
        assertEquals(Verdict.PASSED, judged.verdict)
        val info = rows.single { it.name == SmokeCompare.LOADING_INCL_IDE_ROW }
        assertEquals(4000L, info.measured)
        assertEquals(Verdict.INFO, info.verdict)
        assertEquals(BudgetVerdict.NO_BUDGET, info.budget)
    }

    @Test
    fun `an own part over the budget fails on Linux and is a trend on Windows`() {
        val slow = OpenTrace(100, 1300, -1, -1, emptyList())
        val linux = SmokeCompare.smoke(report(os = "Linux", loading = 1300, trace = slow))
        assertEquals(1, linux.size, linux.toString())
        assertTrue(linux[0].contains("took 1200 ms"), linux.toString())
        assertEquals(emptyList<String>(), SmokeCompare.smoke(report(os = "Windows 11", loading = 1300, trace = slow)))
    }

    @Test
    fun `a loading panel without an observed editor or placeholder is a problem`() {
        val noEditor = SmokeCompare.smoke(report(trace = OpenTrace(-1, 50, -1, -1, emptyList())))
        assertEquals(1, noEditor.size, noEditor.toString())
        assertTrue(noEditor[0].contains("the probe saw no editor/placeholder for the loading panel"), noEditor.toString())
        val noPlaceholder = SmokeCompare.smoke(report(os = "Windows 11", trace = OpenTrace(50, -1, -1, -1, emptyList())))
        assertEquals(1, noPlaceholder.size, noPlaceholder.toString())
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

    @Test
    fun `the open diagnostics reach the rows as values without a budget and never fail`() {
        val trace = OpenTrace(1800, 1900, 4200, 3900, listOf(StallSample(120, 4200), StallSample(2000, 80)))
        val rows = ArrayList<BudgetRow>()
        assertEquals(emptyList<String>(), SmokeCompare.smoke(report(os = "Mac OS X", trace = trace), rows))
        val info = rows.filter { it.verdict == Verdict.INFO }
        assertEquals(listOf(40L, 1800L, 1900L, 3900L, 4200L, 4200L, 80L), info.map { it.measured })
        assertTrue(info.all { it.budget == BudgetVerdict.NO_BUDGET && it.limit == BudgetVerdict.NO_BUDGET })
        assertTrue(info.any { it.name.contains("stall #1, asked 120 ms") })
    }

    @Test
    fun `a diagnostic that was not measured is shown and does not fail`() {
        val rows = ArrayList<BudgetRow>()
        assertEquals(emptyList<String>(), SmokeCompare.smoke(report(), rows))
        assertEquals(listOf(40L, 1000L, 1005L, -1L, -1L), rows.filter { it.verdict == Verdict.INFO }.map { it.measured })
    }

    @Test
    fun `the open diagnostics are written to the JSON`() {
        val trace = OpenTrace(10, 20, 300, 250, listOf(StallSample(5, 300)))
        val root = JsonParser.parseString(report(trace = trace)).asJsonObject
        assertEquals(10L, root.get("editorCreatedMs").asLong)
        assertEquals(20L, root.get("placeholderAddedMs").asLong)
        assertEquals(300L, root.get("edtMaxStallMs").asLong)
        assertEquals(250L, root.get("edtMaxStallToPlaceholderMs").asLong)
        val sample = root.getAsJsonArray("edtStallSamples").get(0).asJsonObject
        assertEquals(5L, sample.get("atMs").asLong)
        assertEquals(300L, sample.get("stallMs").asLong)
    }

    @Test
    fun `every theme shows how long the IDE and the plugin took without judging them`() {
        val themes = SmokeThemes.WANTED.map { theme(it).copy(notifiedMs = 12, sentMs = 34, switchCallMs = 56, refreshMs = 20) }
        val rows = ArrayList<BudgetRow>()
        assertEquals(emptyList<String>(), SmokeCompare.themes(report(themes = themes), rows))
        val name = SmokeThemes.WANTED[0].name
        assertEquals(56L, rows.single { it.name == "AC-028 $name diag: IDE switch call returned" }.measured)
        assertEquals(12L, rows.single { it.name == "AC-028 $name diag: IDE notified the plugin" }.measured)
        assertEquals(20L, rows.single { it.name == "AC-028 $name diag: plugin refresh started" }.measured)
        val sent = rows.single { it.name == "AC-028 $name diag: plugin sent the script" }
        assertEquals(34L, sent.measured)
        assertEquals(Verdict.INFO, sent.verdict)
        assertEquals(SmokeThemes.WANTED.size * 4, rows.count { it.verdict == Verdict.INFO })
        assertEquals(SmokeThemes.WANTED.size, rows.count { it.verdict != Verdict.INFO })
    }

    @Test
    fun `a record without the theme diagnostics reads as not observed`() {
        val json = JsonParser.parseString(report()).asJsonObject
        json.getAsJsonArray("themes").forEach { it.asJsonObject.run { remove("notifiedMs"); remove("sentMs"); remove("switchCallMs"); remove("refreshMs") } }
        val rows = ArrayList<BudgetRow>()
        assertEquals(emptyList<String>(), SmokeCompare.themes(json.toString(), rows))
        assertEquals(0, rows.count { it.verdict == Verdict.INFO })
        assertEquals(-1L, SmokeThemes.WANTED.map { theme(it) }.first().sentMs)
    }
}
