package com.gregorbiswanger.featherspec.studio.probe

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class IdeaLogScanTest {
    private fun line(level: String, category: String, message: String) =
        "2026-11-21 10:00:00,123 [  4321]   $level - #$category - $message"

    @Test
    fun `an error naming featherspec is a problem`() {
        val log = line("ERROR", "c.g.f.s.StudioProjectService", "The FeatherSpec core failed")
        assertEquals(listOf(log), IdeaLogScan.problems(log))
    }

    @Test
    fun `a severe entry is a problem`() {
        val log = line("SEVERE", "c.i.o.a.i.ApplicationImpl", "Plugin to blame: FeatherSpec Studio version: 0.1.0")
        assertEquals(1, IdeaLogScan.problems(log).size)
    }

    @Test
    fun `another component's error that only names our last action is not a problem`() {
        val log = listOf(
            line("SEVERE", "c.i.p.a.c.ProfilerRunConfigurationsManager", "Last Action: featherspec.studio.setup"),
            line("SEVERE", "c.i.o.a.i.ApplicationImpl", "The featherspec word in another plugin's text"),
        ).joinToString("\n")
        assertEquals(emptyList<String>(), IdeaLogScan.problems(log))
    }

    @Test
    fun `a stack trace line naming the plugin package counts for its error header`() {
        val log = listOf(
            line("ERROR", "c.i.o.p.PluginException", "Plugin failed"),
            "java.lang.IllegalStateException: x",
            "\tat com.gregorbiswanger.featherspec.studio.Foo.bar(Foo.kt:3)",
            line("INFO", "c.i.o.a.Other", "later"),
        ).joinToString("\n")
        assertEquals(1, IdeaLogScan.problems(log).size)
    }

    @Test
    fun `the abbreviated plugin category counts`() {
        assertEquals(1, IdeaLogScan.problems(line("ERROR", "c.g.f.s.Thing", "boom")).size)
    }

    @Test
    fun `an error of another plugin, a warning and an info that mentions error are not problems`() {
        val log = listOf(
            line("ERROR", "c.i.o.a.Other", "unrelated failure"),
            line("WARN", "c.g.f.s.StudioProjectService", "The FeatherSpec core could not be started"),
            line("INFO", "c.g.f.s.Thing", "featherspec ERROR in text"),
            "ERROR - without a timestamp but featherspec",
        ).joinToString("\n")
        assertEquals(emptyList<String>(), IdeaLogScan.problems(log))
    }

    @Test
    fun `an empty log has no problem and a long header is cut`() {
        assertEquals(emptyList<String>(), IdeaLogScan.problems(""))
        val long = line("ERROR", "c.g.f.s.Thing", "x".repeat(1000))
        assertEquals(300, IdeaLogScan.problems(long).single().length)
    }
}
