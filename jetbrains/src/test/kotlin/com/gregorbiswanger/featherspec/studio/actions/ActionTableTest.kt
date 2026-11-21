package com.gregorbiswanger.featherspec.studio.actions

import com.google.gson.JsonParser
import com.gregorbiswanger.featherspec.studio.runtime.CoreState
import com.gregorbiswanger.featherspec.studio.runtime.INVOKE_COMMANDS
import com.gregorbiswanger.featherspec.studio.runtime.UnavailableKind
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.w3c.dom.Element
import java.nio.file.Files
import java.nio.file.Path
import javax.xml.parsers.DocumentBuilderFactory

class ActionTableTest {
    private val skipped = setOf("featherspec-studio.shellAction", "featherspec-studio.selectSpec")

    private val manifest: List<Pair<String, String>> = run {
        val root = JsonParser.parseString(Files.readString(locate("package.json"))).asJsonObject
        root.getAsJsonObject("contributes").getAsJsonArray("commands")
            .map { it.asJsonObject }
            .filter { it.get("command").asString !in skipped }
            .map { "featherspec.studio." + it.get("command").asString.removePrefix("featherspec-studio.") to it.get("title").asString }
    }

    private val actions: List<Element> = run {
        val document = DocumentBuilderFactory.newInstance().newDocumentBuilder().parse(locate("jetbrains/src/main/resources/META-INF/plugin.xml").toFile())
        val nodes = document.getElementsByTagName("action")
        (0 until nodes.length).map { nodes.item(it) as Element }
    }

    private val step = RowSelection("{\"row\":{}}", step = true, plan = false, map = false)
    private val bare = RowSelection("{\"row\":{}}", step = false, plan = false, map = false)

    @Test
    fun `AC-017 the table equals the manifest commands minus shellAction and selectSpec`() {
        assertEquals(manifest, ActionTable.rows.map { it.id to it.title })
    }

    @Test
    fun `AC-017 ids are unique and carry the prefix`() {
        val ids = ActionTable.rows.map { it.id }
        assertEquals(ids.size, ids.toSet().size)
        assertTrue(ids.all { it.startsWith(ActionTable.ID_PREFIX) })
    }

    @Test
    fun `AC-017 every registered action has a class, a table row and the manifest title`() {
        assertTrue(actions.isNotEmpty())
        val sources = Files.walk(locate("jetbrains/src/main/kotlin")).use { stream ->
            stream.filter { it.toString().endsWith(".kt") }.map { Files.readString(it) }.toList()
        }
        for (action in actions) {
            val id = action.getAttribute("id")
            val row = ActionTable.byId(id)
            assertNotNull(row, "$id has no table row")
            assertEquals(row!!.title, action.getAttribute("text"), id)
            val simple = action.getAttribute("class").substringAfterLast('.')
            val pattern = Regex("class\\s+" + Regex.escape(simple) + "\\b")
            assertTrue(sources.any { pattern.containsMatchIn(it) }, "$id: no class $simple")
        }
    }

    @Test
    fun `AC-017 every table row is registered once`() {
        assertEquals(ActionTable.rows.map { it.id }.sorted(), actions.map { it.getAttribute("id") }.sorted())
    }

    @Test
    fun `AC-017 the popup group lists the table's popup actions in order and they are tree rows`() {
        val document = DocumentBuilderFactory.newInstance().newDocumentBuilder().parse(locate("jetbrains/src/main/resources/META-INF/plugin.xml").toFile())
        val groups = document.getElementsByTagName("group")
        val group = (0 until groups.length).map { groups.item(it) as Element }.single { it.getAttribute("id") == ActionTable.TREE_POPUP_ID }
        val refs = group.getElementsByTagName("reference")
        assertEquals(ActionTable.popupActionIds, (0 until refs.length).map { (refs.item(it) as Element).getAttribute("ref") })
        for (id in ActionTable.popupActionIds) {
            assertTrue(ActionTable.byId(id)!!.needs != Need.NONE, id)
        }
    }

    @Test
    fun `the title actions exist in the table`() {
        assertEquals(4, ActionTable.titleActionIds.size)
        ActionTable.titleActionIds.forEach { assertNotNull(ActionTable.byId(it), it) }
    }

    @Test
    fun `every core row names a bridge command and valid JSON arguments`() {
        for (row in ActionTable.rows.filter { it.target == Target.CORE }) {
            assertTrue(row.command in INVOKE_COMMANDS, "${row.id}: ${row.command}")
            assertTrue(JsonParser.parseString(row.args).isJsonObject, row.id)
        }
    }

    @Test
    fun `the three area rows open their areas and Open starts`() {
        assertEquals("{\"via\":\"start\"}", ActionTable.byId("featherspec.studio.open")!!.args)
        assertEquals("{\"via\":\"area\",\"area\":\"overview\"}", ActionTable.byId("featherspec.studio.openOverview")!!.args)
        assertEquals("{\"via\":\"area\",\"area\":\"board\"}", ActionTable.byId("featherspec.studio.openBoard")!!.args)
        assertEquals("{\"via\":\"area\",\"area\":\"planMap\"}", ActionTable.byId("featherspec.studio.openPlanMap")!!.args)
    }

    @Test
    fun `the tree rows map to the tree commands`() {
        assertEquals("tree.copy", ActionTable.byId("featherspec.studio.tree.copyNextStep")!!.command)
        assertEquals("tree.openSpec", ActionTable.byId("featherspec.studio.tree.openSpec")!!.command)
        assertEquals("tree.openPlan", ActionTable.byId("featherspec.studio.tree.openPlan")!!.command)
        assertEquals("tree.showInPlanMap", ActionTable.byId("featherspec.studio.tree.showInPlanMap")!!.command)
    }

    @Test
    fun `H-7 tree rows are enabled by the row flags only`() {
        val copy = ActionTable.byId("featherspec.studio.tree.copyNextStep")!!
        val spec = ActionTable.byId("featherspec.studio.tree.openSpec")!!
        val plan = ActionTable.byId("featherspec.studio.tree.openPlan")!!
        val map = ActionTable.byId("featherspec.studio.tree.showInPlanMap")!!
        assertFalse(ActionRules.enabled(copy, null))
        assertFalse(ActionRules.enabled(spec, null))
        assertTrue(ActionRules.enabled(spec, bare))
        assertFalse(ActionRules.enabled(copy, bare))
        assertFalse(ActionRules.enabled(plan, bare))
        assertFalse(ActionRules.enabled(map, bare))
        assertTrue(ActionRules.enabled(copy, step))
        assertTrue(ActionRules.enabled(plan, bare.copy(plan = true)))
        assertTrue(ActionRules.enabled(map, bare.copy(map = true)))
    }

    @Test
    fun `H-7 rows without a need are always enabled`() {
        for (row in ActionTable.rows.filter { it.needs == Need.NONE }) {
            assertTrue(ActionRules.enabled(row, null), row.id)
        }
    }

    @Test
    fun `a ready core invokes the row command, with the selected row for tree rows`() {
        val open = ActionTable.byId("featherspec.studio.openBoard")!!
        assertEquals(Outcome.Invoke("open", "{\"via\":\"area\",\"area\":\"board\"}"), ActionRules.outcome(open, null, CoreState.Ready))
        val copy = ActionTable.byId("featherspec.studio.tree.copyNextStep")!!
        assertEquals(Outcome.Invoke("tree.copy", step.args), ActionRules.outcome(copy, step, CoreState.Ready))
    }

    @Test
    fun `a tree row without its flag does nothing`() {
        val copy = ActionTable.byId("featherspec.studio.tree.copyNextStep")!!
        assertEquals(Outcome.Skip, ActionRules.outcome(copy, bare, CoreState.Ready))
        assertEquals(Outcome.Skip, ActionRules.outcome(copy, null, CoreState.Ready))
    }

    @Test
    fun `AC-030 without JCEF Open, Copy Next Step and Set Up give the notice and nothing else`() {
        for (kind in UnavailableKind.values()) {
            for (name in listOf("open", "copyNextStep", "setup")) {
                val row = ActionTable.byId("featherspec.studio.$name")!!
                assertEquals(Outcome.Notice(kind), ActionRules.outcome(row, null, CoreState.Unavailable(kind)), name)
            }
        }
    }

    @Test
    fun `AC-030 the settings row works without JCEF`() {
        val settings = ActionTable.byId("featherspec.studio.openSettings")!!
        assertEquals(Outcome.Settings, ActionRules.outcome(settings, null, CoreState.Unavailable(UnavailableKind.SUSPENDED)))
        assertEquals(Outcome.Settings, ActionRules.outcome(settings, null, CoreState.Ready))
    }

    @Test
    fun `a loading or failed core still invokes`() {
        val refresh = ActionTable.byId("featherspec.studio.refresh")!!
        assertEquals(Outcome.Invoke("refresh", "{}"), ActionRules.outcome(refresh, null, CoreState.Loading))
        assertEquals(Outcome.Invoke("refresh", "{}"), ActionRules.outcome(refresh, null, CoreState.Failed("x")))
    }

    private fun locate(relative: String): Path {
        val candidates = listOf(Path.of("..").resolve(relative), Path.of(relative), Path.of(relative.removePrefix("jetbrains/")))
        return candidates.firstOrNull { Files.exists(it) } ?: error("$relative not found from ${Path.of("").toAbsolutePath()}")
    }
}
