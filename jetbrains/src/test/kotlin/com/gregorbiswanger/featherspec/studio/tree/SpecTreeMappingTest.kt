package com.gregorbiswanger.featherspec.studio.tree

import com.google.gson.JsonParser
import com.gregorbiswanger.featherspec.studio.HostTexts
import com.gregorbiswanger.featherspec.studio.runtime.CoreState
import com.gregorbiswanger.featherspec.studio.runtime.UnavailableKind
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class SpecTreeMappingTest {
    private fun fixture(name: String): String {
        val stream = SpecTreeMappingTest::class.java.getResourceAsStream("/tree/$name.json")
        assertNotNull(stream, "missing fixture $name")
        return stream!!.use { String(it.readBytes(), Charsets.UTF_8) }
    }

    private fun view(name: String): SpecTreeView {
        val parsed = SpecTreeMapping.parse(fixture(name))
        assertNotNull(parsed, "unparsable fixture $name")
        return parsed!!
    }

    @Test
    fun `AC-010 a review spec becomes a group with one row, its flags, icon and description`() {
        val tree = view("studio-0015")
        assertEquals(1, tree.groups.size)
        val group = tree.groups[0]
        assertEquals("group:inProgress", group.id)
        assertEquals("In progress", group.label)
        assertEquals("1", group.description)
        assertFalse(group.collapsed)
        assertEquals(NodeIcon.NONE, group.icon)
        assertNull(group.tooltip)
        val row = group.children.single()
        assertEquals("0015 Focus the…", row.label)
        assertEquals("/sdd-compile", row.description)
        assertEquals(NodeIcon.EYE, row.icon)
        assertEquals(Tone(0xB86E00, 0xE0A030), row.tone)
        assertTrue(row.step)
        assertTrue(row.plan)
        assertTrue(row.map)
        assertEquals("Review", row.state)
        assertEquals("0015-focus-on-visibility", row.stem)
        assertEquals(".specs/active/0015-focus-on-visibility.md", row.specKey)
        assertEquals(".specs/active/0015-focus-on-visibility.plan.md", row.planKey)
        assertEquals("/sdd-compile .specs/active/0015-focus-on-visibility.md", row.line)
        assertNull(row.path)
        assertNull(row.mapStep)
        assertTrue(row.accessibleLabel.startsWith("0015 Focus the Studio on Visibility"))
    }

    @Test
    fun `AC-012 the waiting count is Review plus Blocked and matches the emitted badge`() {
        assertEquals(1, view("studio-0015").waiting)
        assertEquals("1 spec waits for you: 1 in Review", view("studio-0015").badgeTooltip)
        assertEquals(1, view("fs110-parallel-synthetic").waiting)
        assertEquals("1 spec waits for you: 1 Blocked", view("fs110-parallel-synthetic").badgeTooltip)
        assertEquals(0, view("fs110-ready-synthetic").waiting)
        assertNull(view("fs110-ready-synthetic").badgeTooltip)
        assertEquals(0, view("fs-broken").waiting)
    }

    @Test
    fun `AC-012 the tool window title carries the count only from one on`() {
        assertEquals("FeatherSpec Studio", SpecTreeMapping.title(0))
        assertEquals("FeatherSpec Studio (1)", SpecTreeMapping.title(1))
        assertEquals("FeatherSpec Studio (12)", SpecTreeMapping.title(12))
    }

    @Test
    fun `AC-010 groups keep their order, done starts collapsed and the problem hint rides on the group`() {
        val tree = view("fs-broken")
        assertEquals(listOf("In progress", "Backlog", "Done"), tree.groups.map { it.label })
        assertEquals(listOf(false, false, true), tree.groups.map { it.collapsed })
        assertEquals(listOf("1 · 1 problem", "1", "1 · 1 problem"), tree.groups.map { it.description })
        assertEquals(NodeIcon.WARNING, tree.groups[0].icon)
        assertEquals(NodeIcon.NONE, tree.groups[1].icon)
        assertEquals("In progress: 1 spec · 1 problem", tree.groups[0].tooltip)
        assertEquals(Tone(0xB86E00, 0xF2C55C), tree.groups[0].tone)
        assertEquals(NodeIcon.WARNING, tree.groups[0].children.single().icon)
        assertEquals(NodeIcon.LIST_FLAT, tree.groups[1].children.single().icon)
    }

    @Test
    fun `AC-010 the state icons and colours map and a grey colour has no tone`() {
        val ready = view("fs110-ready-synthetic")
        assertEquals(NodeIcon.PASS, ready.groups[0].children.single().icon)
        assertEquals(Tone(0x3574F0, 0x548AF7), ready.groups[0].children.single().tone)
        val done = ready.groups[1].children.single()
        assertEquals(NodeIcon.CHECK, done.icon)
        assertNull(done.tone)
        assertEquals(NodeIcon.CIRCLE_SLASH, view("fs110-parallel-synthetic").groups[0].children.single().icon)
        assertEquals(NodeIcon.PLAY, NodeIcon.fromCodicon("play"))
        assertEquals(NodeIcon.NONE, NodeIcon.fromCodicon("unknown-icon"))
        assertEquals(NodeIcon.NONE, NodeIcon.fromCodicon(null))
    }

    @Test
    fun `AC-011 the context flags follow the contextValue words`() {
        val done = view("fs110-ready-synthetic").groups[1].children.single()
        assertFalse(done.step)
        assertTrue(done.plan)
        assertFalse(done.map)
        assertNull(done.line)
        val backlog = view("fs-broken").groups[1].children.single()
        assertTrue(backlog.step)
        assertFalse(backlog.plan)
        assertFalse(backlog.map)
        assertNull(backlog.planKey)
    }

    @Test
    fun `AC-011 the row arguments are the row object the core reads`() {
        val row = view("studio-0015").groups[0].children.single()
        val args = JsonParser.parseString(row.rowArgs()).asJsonObject.getAsJsonObject("row")
        assertEquals(".specs/active/0015-focus-on-visibility.md", args.get("specKey").asString)
        assertEquals("0015-focus-on-visibility", args.get("stem").asString)
        assertEquals(".specs/active/0015-focus-on-visibility.plan.md", args.get("planKey").asString)
        assertEquals("/sdd-compile .specs/active/0015-focus-on-visibility.md", args.get("line").asString)
        assertFalse(args.has("path"))
        assertFalse(args.has("mapStep"))
        val withPath = row.copy(path = ".specs/active", mapStep = "T-001")
        val full = JsonParser.parseString(withPath.rowArgs()).asJsonObject.getAsJsonObject("row")
        assertEquals(".specs/active", full.get("path").asString)
        assertEquals("T-001", full.get("mapStep").asString)
    }

    @Test
    fun `AC-007 no tree yet shows the loading text`() {
        assertEquals(EmptyContent(listOf(HostTexts.LOADING), emptyList()), SpecTreeMapping.emptyContent(null, CoreState.Loading))
        assertEquals(EmptyContent(listOf(HostTexts.LOADING), emptyList()), SpecTreeMapping.emptyContent(null, CoreState.Ready))
    }

    @Test
    fun `AC-007 a failed core shows the project could not be loaded text with a show output link`() {
        val content = SpecTreeMapping.emptyContent(view("studio-0015"), CoreState.Failed("boom"))
        assertEquals(listOf(HostTexts.S5), content.lines)
        assertEquals(
            listOf(EmptyAction(HostTexts.SHOW_OUTPUT, "shellAction", "{\"action\":\"showOutput\"}")),
            content.actions,
        )
    }

    @Test
    fun `AC-011 an unavailable core shows the reason and no tree`() {
        assertEquals(
            EmptyContent(listOf(HostTexts.JCEF_UNSUPPORTED), emptyList()),
            SpecTreeMapping.emptyContent(null, CoreState.Unavailable(UnavailableKind.UNSUPPORTED)),
        )
        assertEquals(
            EmptyContent(listOf(HostTexts.JCEF_SUSPENDED), emptyList()),
            SpecTreeMapping.emptyContent(view("studio-0015"), CoreState.Unavailable(UnavailableKind.SUSPENDED)),
        )
    }

    @Test
    fun `AC-010 a tree with rows has no empty text`() {
        assertEquals(EmptyContent(emptyList(), emptyList()), SpecTreeMapping.emptyContent(view("studio-0015"), CoreState.Ready))
    }

    @Test
    fun `AC-010 a project without specs shows the message of the core`() {
        val content = SpecTreeMapping.emptyContent(view("fs-setup-not-run"), CoreState.Ready)
        assertEquals(
            listOf("Welcome to FeatherSpec. Set up this project first: run /sdd-setup with the AI assistant of your choice."),
            content.lines,
        )
        assertTrue(content.actions.isEmpty())
        assertTrue(view("fs-setup-not-run").groups.isEmpty())
    }

    @Test
    fun `AC-010 an incomplete project shows its message and the action rows as links`() {
        val tree = view("incomplete-agents-only")
        assertTrue(tree.groups.isEmpty())
        assertEquals(listOf("Set up FeatherSpec", "Open setup guide", "Refresh"), tree.actions.map { it.label })
        assertEquals(listOf("setUp", "openSetupGuide", "refresh"), tree.actions.map { it.action })
        val content = SpecTreeMapping.emptyContent(tree, CoreState.Ready)
        assertEquals(listOf("FeatherSpec project incomplete: memory://fixture has no .specs/ directory."), content.lines)
        assertEquals(
            listOf(
                EmptyAction("Set up FeatherSpec", "shellAction", "{\"action\":\"setUp\"}"),
                EmptyAction("Open setup guide", "shellAction", "{\"action\":\"openSetupGuide\"}"),
                EmptyAction("Refresh", "shellAction", "{\"action\":\"refresh\"}"),
            ),
            content.actions,
        )
    }

    @Test
    fun `AC-010 a workspace without a project shows the welcome text with three links`() {
        val tree = view("nested-project")
        assertTrue(tree.welcome)
        assertTrue(tree.groups.isEmpty())
        val content = SpecTreeMapping.emptyContent(tree, CoreState.Ready)
        assertEquals(2, content.lines.size)
        assertEquals("No FeatherSpec project found.", content.lines[0])
        assertTrue(content.lines[1].startsWith("Set up FeatherSpec downloads"))
        assertEquals(listOf("setup", "shellAction", "shellAction"), content.actions.map { it.command })
        assertEquals(listOf("Set up FeatherSpec", "Open setup guide", "Refresh"), content.actions.map { it.label })
        assertEquals("{\"action\":\"openSetupGuide\"}", content.actions[1].args)
    }

    @Test
    fun `AC-010 the project name rides in the description and malformed input is ignored`() {
        val named = SpecTreeMapping.parse("{\"items\":[],\"description\":\"demo\",\"message\":\"m\"}")
        assertEquals("demo", named!!.description)
        assertEquals("m", named.message)
        assertNull(SpecTreeMapping.parse("not json"))
        assertNull(SpecTreeMapping.parse("[1]"))
        assertNull(SpecTreeMapping.parse("null"))
        val sparse = SpecTreeMapping.parse("{\"items\":[1,{\"kind\":\"other\"},{\"kind\":\"group\"},{\"kind\":\"action\",\"label\":\"x\"}]}")
        assertTrue(sparse!!.groups.isEmpty())
        assertTrue(sparse.actions.isEmpty())
        assertNull(sparse.message)
        assertNull(sparse.description)
    }

    @Test
    fun `AC-010 the tooltip markdown becomes plain safe html`() {
        val html = view("studio-0015").groups[0].children.single().tooltipHtml
        assertTrue(html.startsWith("<html><b>0015 Focus the Studio on Visibility: No Agent Runs, a Named Next Step</b><br><br>Review"))
        assertTrue(html.contains("<code>/sdd-compile .specs/active/0015-focus-on-visibility.md</code>"))
        assertTrue(html.endsWith("</html>"))
        assertFalse(html.contains("\\"))
        assertFalse(html.contains("**"))
        assertFalse(html.contains("`"))
    }

    @Test
    fun `AC-010 the tooltip escapes markup, unescapes markdown and pads code`() {
        assertEquals("<html>a &lt;b&gt; &amp; &quot;c&quot; - d</html>", TooltipText.html("a <b> & \"c\" \\- d"))
        assertEquals("<html><code>`x`</code></html>", TooltipText.html("`` `x` ``"))
        assertEquals("<html><code>&lt;i&gt;</code></html>", TooltipText.html("`<i>`"))
        assertEquals("<html><b>open</b></html>", TooltipText.html("**open"))
        assertEquals("<html>a`b</html>", TooltipText.html("a`b"))
        assertEquals("<html>1\\2</html>", TooltipText.html("1\\\\2"))
    }
}
