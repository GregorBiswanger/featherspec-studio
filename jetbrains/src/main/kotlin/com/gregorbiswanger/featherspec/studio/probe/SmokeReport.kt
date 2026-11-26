package com.gregorbiswanger.featherspec.studio.probe

import com.google.gson.JsonArray
import com.google.gson.JsonElement
import com.google.gson.JsonObject
import com.google.gson.JsonParser
import com.gregorbiswanger.featherspec.studio.theme.ContrastReport
import com.gregorbiswanger.featherspec.studio.theme.ThemeMapping

object SmokeBudgets {
    const val LOADING_MS = 1_000L
    const val FRAME_MS = 1_000L
    const val EXTERNAL_MS = 2_000L
    const val IN_IDE_MS = 500L
    const val THEME_MS = 500L
    const val FRAME_SAMPLES = 3
}

data class ThemeRecord(
    val wanted: String,
    val found: String,
    val expectedBodyClass: String,
    val bodyClass: String,
    val ms: Long,
    val scripts: Int,
    val incompleteScripts: Int,
    val missingVariables: List<String>,
    val contrast: ContrastReport,
)

data class SmokeReport(
    val os: String,
    val stateAtOpen: String,
    val loadingMs: Long,
    val firstFrameMs: Long,
    val reopenFrameSamples: List<Long>,
    val externalTreeMs: Long,
    val externalStatusMs: Long,
    val inIdeTreeMs: Long,
    val inIdeStatusMs: Long,
    val inIdePanelMs: Long,
    val expectedArea: String,
    val expectedSelection: String,
    val restoredArea: String,
    val restoredSelection: String,
    val restoreFrameSamples: List<Long>,
    val themes: List<ThemeRecord>,
    val files: FileChanges,
    val notes: List<String>,
    val trace: OpenTrace = OpenTrace.NONE,
) {
    val reopenFrameMs: Long get() = best(reopenFrameSamples)
    val restoreFrameMs: Long get() = best(restoreFrameSamples)

    fun toJson(): String {
        val root = JsonObject()
        root.addProperty("os", os)
        root.addProperty("stateAtOpen", stateAtOpen)
        root.addProperty("loadingMs", loadingMs)
        root.addProperty("firstFrameMs", firstFrameMs)
        root.addProperty("reopenFrameMs", reopenFrameMs)
        root.add("reopenFrameSamples", numbers(reopenFrameSamples))
        root.addProperty("externalTreeMs", externalTreeMs)
        root.addProperty("externalStatusMs", externalStatusMs)
        root.addProperty("inIdeTreeMs", inIdeTreeMs)
        root.addProperty("inIdeStatusMs", inIdeStatusMs)
        root.addProperty("inIdePanelMs", inIdePanelMs)
        root.addProperty("expectedArea", expectedArea)
        root.addProperty("expectedSelection", expectedSelection)
        root.addProperty("restoredArea", restoredArea)
        root.addProperty("restoredSelection", restoredSelection)
        root.addProperty("restoreFrameMs", restoreFrameMs)
        root.add("restoreFrameSamples", numbers(restoreFrameSamples))
        root.add("themes", JsonArray().also { array -> themes.forEach { array.add(themeJson(it)) } })
        root.add("created", strings(files.created))
        root.add("changed", strings(files.changed))
        root.add("deleted", strings(files.deleted))
        root.add("notes", strings(notes))
        root.addProperty("editorCreatedMs", trace.editorCreatedMs)
        root.addProperty("placeholderAddedMs", trace.placeholderAddedMs)
        root.addProperty("edtMaxStallMs", trace.edtMaxStallMs)
        root.addProperty("edtMaxStallToPlaceholderMs", trace.edtMaxStallToPlaceholderMs)
        root.add("edtStallSamples", JsonArray().also { array -> trace.edtStallSamples.forEach { array.add(stallJson(it)) } })
        return root.toString()
    }

    private fun stallJson(sample: StallSample): JsonObject {
        val entry = JsonObject()
        entry.addProperty("atMs", sample.atMs)
        entry.addProperty("stallMs", sample.stallMs)
        return entry
    }

    private fun themeJson(theme: ThemeRecord): JsonObject {
        val entry = JsonObject()
        entry.addProperty("wanted", theme.wanted)
        entry.addProperty("found", theme.found)
        entry.addProperty("expectedBodyClass", theme.expectedBodyClass)
        entry.addProperty("bodyClass", theme.bodyClass)
        entry.addProperty("ms", theme.ms)
        entry.addProperty("scripts", theme.scripts)
        entry.addProperty("incompleteScripts", theme.incompleteScripts)
        entry.add("missingVariables", strings(theme.missingVariables))
        entry.addProperty("evaluated", theme.contrast.evaluated)
        entry.add("failures", strings(theme.contrast.failures))
        entry.add("skipped", strings(theme.contrast.skipped))
        return entry
    }

    private fun strings(values: List<String>): JsonArray = JsonArray().also { array -> values.forEach { array.add(it) } }

    private fun numbers(values: List<Long>): JsonArray = JsonArray().also { array -> values.forEach { array.add(it) } }

    companion object {
        fun best(samples: List<Long>): Long = samples.filter { it >= 0 }.minOrNull() ?: -1L
    }
}

object SmokeCompare {
    const val LOADING_ROW = "AC-007 loading panel (editor → placeholder)"
    const val LOADING_INCL_IDE_ROW = "AC-007 loading panel incl. IDE (open → visible)"

    fun smoke(json: String, rows: MutableList<BudgetRow>? = null): List<String> {
        val root = parse(json) ?: return listOf("the probe wrote no JSON object")
        val problems = ArrayList<String>()
        val timing = Timing(text(root, "os"), rows)
        val state = text(root, "stateAtOpen")
        if (state == "loading") {
            loadingPanel(problems, timing, root)
        }
        diagnostics(timing, root)
        within(problems, timing, "AC-007 first frame after Ready", number(root, "firstFrameMs"), null)
        samples(problems, "frame after reopening", root, "reopenFrameSamples")
        within(problems, timing, "AC-007 frame after reopening (best of ${SmokeBudgets.FRAME_SAMPLES})", number(root, "reopenFrameMs"), SmokeBudgets.FRAME_MS)
        within(problems, timing, "AC-021 external change in the tree", number(root, "externalTreeMs"), SmokeBudgets.EXTERNAL_MS)
        within(problems, timing, "AC-021 external change in the status entry", number(root, "externalStatusMs"), SmokeBudgets.EXTERNAL_MS)
        within(problems, timing, "AC-020 in-IDE change in the tree", number(root, "inIdeTreeMs"), SmokeBudgets.IN_IDE_MS)
        within(problems, timing, "AC-020 in-IDE change in the panel", number(root, "inIdePanelMs"), SmokeBudgets.IN_IDE_MS)
        within(problems, timing, "AC-020 in-IDE change in the status entry", number(root, "inIdeStatusMs"), SmokeBudgets.IN_IDE_MS)
        val expectedArea = text(root, "expectedArea")
        val expectedSelection = text(root, "expectedSelection")
        if (expectedArea.isEmpty() || expectedSelection.isEmpty()) {
            problems.add("the probe set no area or selection to restore")
        }
        if (text(root, "restoredArea") != expectedArea) {
            problems.add("area after reopening: expected '$expectedArea', observed '${text(root, "restoredArea")}'")
        }
        if (text(root, "restoredSelection") != expectedSelection) {
            problems.add("selection after reopening: expected '$expectedSelection', observed '${text(root, "restoredSelection")}'")
        }
        samples(problems, "frame after the restoring reopen", root, "restoreFrameSamples")
        within(problems, timing, "frame after the restoring reopen (best of ${SmokeBudgets.FRAME_SAMPLES})", number(root, "restoreFrameMs"), SmokeBudgets.FRAME_MS)
        val created = strings(root, "created")
        if (created != listOf(SmokeFiles.EXTERNAL)) {
            problems.add("AC-025 files created in the project: expected [${SmokeFiles.EXTERNAL}], observed $created")
        }
        val changed = strings(root, "changed")
        if (changed != listOf(SmokeFiles.EDITED)) {
            problems.add("AC-025 files changed in the project: expected [${SmokeFiles.EDITED}], observed $changed")
        }
        val deleted = strings(root, "deleted")
        if (deleted.isNotEmpty()) {
            problems.add("AC-025 files deleted from the project: $deleted")
        }
        return problems
    }

    /**
     * PD-111 (amended 2026-11-26): the judged time is the part of the plugin, from the IDE creating the editor to the
     * placeholder being added. The old time from openFile until the placeholder shows includes the IDE under CI load
     * and stays as a value without a budget.
     */
    private fun loadingPanel(problems: MutableList<String>, timing: Timing, root: JsonObject) {
        val created = number(root, "editorCreatedMs")
        val added = number(root, "placeholderAddedMs")
        val ownMs = if (created < 0 || added < 0) -1L else added - created
        val row = BudgetVerdict.judge(LOADING_ROW, ownMs, SmokeBudgets.LOADING_MS, timing.os)
        timing.rows?.add(row)
        timing.rows?.add(BudgetVerdict.info(LOADING_INCL_IDE_ROW, number(root, "loadingMs"), timing.os))
        if (ownMs < 0) {
            problems.add("$LOADING_ROW was not observed: the probe saw no editor/placeholder for the loading panel (editorCreatedMs=$created, placeholderAddedMs=$added)")
        } else {
            BudgetVerdict.problem(row)?.let { problems.add(it) }
        }
    }

    private fun diagnostics(timing: Timing, root: JsonObject) {
        val rows = timing.rows ?: return
        if (!root.has("edtMaxStallMs")) {
            return
        }
        rows.add(BudgetVerdict.info("AC-007 diag: editor created after openFile", number(root, "editorCreatedMs"), timing.os))
        rows.add(BudgetVerdict.info("AC-007 diag: placeholder added after openFile", number(root, "placeholderAddedMs"), timing.os))
        rows.add(BudgetVerdict.info("AC-007 diag: EDT worst round trip until the placeholder", number(root, "edtMaxStallToPlaceholderMs"), timing.os))
        rows.add(BudgetVerdict.info("AC-007 diag: EDT worst round trip until Ready", number(root, "edtMaxStallMs"), timing.os))
        stalls(root).forEachIndexed { index, sample ->
            rows.add(BudgetVerdict.info("AC-007 diag: EDT stall #${index + 1}, asked ${sample.atMs} ms after openFile", sample.stallMs, timing.os))
        }
    }

    private fun stalls(root: JsonObject): List<StallSample> =
        root.get("edtStallSamples")?.takeIf { it.isJsonArray }?.asJsonArray?.mapNotNull { element ->
            asObject(element)?.let { StallSample(number(it, "atMs"), number(it, "stallMs")) }
        } ?: emptyList()

    fun themes(json: String, rows: MutableList<BudgetRow>? = null): List<String> {
        val root = parse(json) ?: return listOf("the probe wrote no JSON object")
        val problems = ArrayList<String>()
        val timing = Timing(text(root, "os"), rows)
        val entries = root.get("themes")?.takeIf { it.isJsonArray }?.asJsonArray?.mapNotNull { asObject(it) } ?: emptyList()
        if (entries.size != SmokeThemes.WANTED.size) {
            problems.add("themes: expected ${SmokeThemes.WANTED.size} records, observed ${entries.size}")
        }
        SmokeThemes.WANTED.forEach { wanted ->
            val entry = entries.firstOrNull { text(it, "wanted") == wanted.name }
            if (entry == null) {
                problems.add("${wanted.name}: no record")
                return@forEach
            }
            themeProblems(wanted, entry, problems, timing)
        }
        return problems
    }

    private fun themeProblems(wanted: ThemeWant, entry: JsonObject, problems: MutableList<String>, timing: Timing) {
        val name = wanted.name
        if (text(entry, "found").isEmpty()) {
            problems.add("$name: the IDE has no such theme")
            return
        }
        if (text(entry, "bodyClass") != wanted.bodyClass) {
            problems.add("$name: body class expected ${wanted.bodyClass}, observed '${text(entry, "bodyClass")}'")
        }
        within(problems, timing, "AC-028 $name switch", number(entry, "ms"), SmokeBudgets.THEME_MS)
        if (number(entry, "scripts") < 1) {
            problems.add("$name: no update script reached the panel")
        }
        if (number(entry, "incompleteScripts") != 0L) {
            problems.add("$name: ${number(entry, "incompleteScripts")} update script(s) lacked variables or the body class (AC-028)")
        }
        val missing = strings(entry, "missingVariables")
        if (missing.isNotEmpty()) {
            problems.add("$name: variables missing from the update: $missing (of ${ThemeMapping.names.size})")
        }
        strings(entry, "failures").forEach { problems.add("AC-029 $name: $it") }
        val evaluated = number(entry, "evaluated")
        val skipped = strings(entry, "skipped")
        if (evaluated <= skipped.size) {
            problems.add("AC-029 $name: only $evaluated contrast pairs evaluated, skipped $skipped")
        }
    }

    private fun samples(problems: MutableList<String>, label: String, root: JsonObject, name: String) {
        val observed = numbers(root, name)
        if (observed.size != SmokeBudgets.FRAME_SAMPLES) {
            problems.add("$label: expected ${SmokeBudgets.FRAME_SAMPLES} samples, observed $observed")
        }
    }

    private class Timing(val os: String, val rows: MutableList<BudgetRow>?)

    private fun within(problems: MutableList<String>, timing: Timing, label: String, ms: Long, max: Long?) {
        if (max == null) {
            if (ms < 0) {
                problems.add("$label was not observed")
            }
            return
        }
        val row = BudgetVerdict.judge(label, ms, max, timing.os)
        timing.rows?.add(row)
        BudgetVerdict.problem(row)?.let { problems.add(it) }
    }

    private fun parse(json: String): JsonObject? = try {
        asObject(JsonParser.parseString(json))
    } catch (failure: RuntimeException) {
        null
    }

    private fun asObject(element: JsonElement): JsonObject? = if (element.isJsonObject) element.asJsonObject else null

    private fun text(root: JsonObject, name: String): String =
        root.get(name)?.takeIf { it.isJsonPrimitive }?.asString.orEmpty()

    private fun number(root: JsonObject, name: String): Long {
        val member = root.get(name)
        return if (member != null && member.isJsonPrimitive && member.asJsonPrimitive.isNumber) member.asLong else -1L
    }

    private fun numbers(root: JsonObject, name: String): List<Long> =
        root.get(name)?.takeIf { it.isJsonArray }?.asJsonArray?.map { it.asLong } ?: emptyList()

    private fun strings(root: JsonObject, name: String): List<String> =
        root.get(name)?.takeIf { it.isJsonArray }?.asJsonArray?.map { it.asString } ?: emptyList()
}
