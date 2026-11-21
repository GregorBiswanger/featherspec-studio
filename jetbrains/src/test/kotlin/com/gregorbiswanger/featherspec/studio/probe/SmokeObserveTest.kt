package com.gregorbiswanger.featherspec.studio.probe

import com.gregorbiswanger.featherspec.studio.theme.ThemeKind
import com.gregorbiswanger.featherspec.studio.theme.ThemeMapping
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.nio.file.Files
import java.nio.file.Path

class SmokeObserveTest {
    @TempDir
    lateinit var dir: Path

    private val shell =
        "{\"v\":1,\"kind\":\"evt\",\"seq\":2,\"type\":\"shell\",\"payload\":{\"view\":{\"area\":\"board\",\"selection\":{\"stem\":\"0015-x\",\"number\":\"0015\"}}}}"

    @Test
    fun `a panel envelope names its type and a shell envelope its area and selection`() {
        assertEquals("shell", PanelFrames.type(shell))
        assertEquals("board", PanelFrames.type("{\"type\":\"board\",\"payload\":{}}"))
        assertEquals(ShellFacts("board", "0015-x"), PanelFrames.shell(shell))
        assertEquals(
            ShellFacts("overview", ""),
            PanelFrames.shell("{\"type\":\"shell\",\"payload\":{\"view\":{\"area\":\"overview\"}}}"),
        )
    }

    @Test
    fun `text that is no envelope has no type and no shell facts`() {
        assertEquals("", PanelFrames.type("nope"))
        assertEquals("", PanelFrames.type("[]"))
        assertNull(PanelFrames.shell("{\"type\":\"board\"}"))
        assertNull(PanelFrames.shell("{\"type\":\"shell\",\"payload\":{}}"))
        assertNull(PanelFrames.shell("nope"))
    }

    @Test
    fun `the update script of the mapping is read back with its body class and every value`() {
        val variables = ThemeMapping.variables({ null }, ThemeKind.DARK)
        val script = ThemeMapping.updateScript(variables, ThemeKind.DARK, "<style>body { content: \"x\"; }</style>")
        val observed = ThemeScriptReader.read(script)
        assertEquals("vscode-dark", observed.bodyClass)
        assertEquals(variables, observed.variables)
        assertTrue(observed.complete(ThemeMapping.names))
        assertEquals(emptyList<String>(), observed.missing(ThemeMapping.names))
    }

    @Test
    fun `values with quotes and escapes survive the reading`() {
        val variables = mapOf("--vscode-font-family" to "\"Inter\", system-ui, sans-serif", "--x" to "a\\b")
        val script = ThemeMapping.updateScript(variables, ThemeKind.LIGHT, "")
        assertEquals(variables, ThemeScriptReader.read(script).variables)
        assertEquals("a\nb\u0001", ThemeScriptReader.unquote("\"a\\nb\\u0001\""))
    }

    @Test
    fun `a script without a body class or with a variable missing is incomplete`() {
        val variables = ThemeMapping.variables({ null }, ThemeKind.LIGHT)
        val without = variables - "--vscode-foreground"
        val script = ThemeMapping.updateScript(without, ThemeKind.LIGHT, "")
        val observed = ThemeScriptReader.read(script)
        assertFalse(observed.complete(ThemeMapping.names))
        assertEquals(listOf("--vscode-foreground"), observed.missing(ThemeMapping.names))
        assertFalse(ThemeScriptReader.read("nothing here").complete(ThemeMapping.names))
    }

    @Test
    fun `a wanted theme is found by its exact name and High Contrast by its word`() {
        val names = listOf("Light with Light Header", "Light", "Islands Light", "Islands Dark", "Darcula", "High contrast")
        assertEquals(1, SmokeThemes.pick(names, "Light"))
        assertEquals(2, SmokeThemes.pick(names, "islands light"))
        assertEquals(5, SmokeThemes.pick(names, "High Contrast"))
        assertEquals(-1, SmokeThemes.pick(listOf("Light"), "Darcula"))
    }

    @Test
    fun `the order never starts with the current theme and keeps every theme once`() {
        for (want in SmokeThemes.WANTED) {
            val order = SmokeThemes.order(want.name)
            assertEquals(SmokeThemes.WANTED.map { it.name }.sorted(), order.map { it.name }.sorted())
        }
        assertEquals("Darcula", SmokeThemes.order("Light").first().name)
        assertEquals("Light", SmokeThemes.order("Darcula").first().name)
        assertEquals("Light", SmokeThemes.order("Something else").first().name)
    }

    @Test
    fun `the snapshot skips the IDE folder and the diff names created, changed and deleted files`() {
        Files.createDirectories(dir.resolve(".idea"))
        Files.createDirectories(dir.resolve(".specs"))
        Files.writeString(dir.resolve(".idea").resolve("workspace.xml"), "x")
        Files.writeString(dir.resolve(".specs").resolve("a.md"), "one")
        Files.writeString(dir.resolve(".specs").resolve("b.md"), "two")
        val before = SmokeFiles.snapshot(dir)
        assertEquals(setOf(".specs/a.md", ".specs/b.md"), before.keys)
        Files.writeString(dir.resolve(".specs").resolve("a.md"), "longer text")
        Files.delete(dir.resolve(".specs").resolve("b.md"))
        Files.writeString(dir.resolve(".specs").resolve("c.md"), "new")
        Files.writeString(dir.resolve(".idea").resolve("other.xml"), "y")
        val changes = SmokeFiles.diff(before, SmokeFiles.snapshot(dir))
        assertEquals(FileChanges(listOf(".specs/c.md"), listOf(".specs/a.md"), listOf(".specs/b.md")), changes)
    }

    @Test
    fun `an unchanged tree has no difference`() {
        Files.writeString(dir.resolve("AGENTS.md"), "x")
        val before = SmokeFiles.snapshot(dir)
        assertEquals(FileChanges(emptyList(), emptyList(), emptyList()), SmokeFiles.diff(before, SmokeFiles.snapshot(dir)))
    }

    @Test
    fun `the title gets the suffix before its line end and nothing else changes`() {
        assertEquals("# T (smoke)\nbody\n", SmokeFiles.appendToTitle("# T\nbody\n"))
        assertEquals("# T (smoke)\r\nbody", SmokeFiles.appendToTitle("# T\r\nbody"))
        assertEquals("# T (smoke)", SmokeFiles.appendToTitle("# T"))
    }

    @Test
    fun `the external spec is a numbered backlog draft`() {
        assertTrue(Regex("^\\.specs/backlog/\\d{4}-.+\\.md$").matches(SmokeFiles.EXTERNAL))
        assertTrue(SmokeFiles.EXTERNAL_TEXT.startsWith("# "))
        assertTrue(SmokeFiles.EXTERNAL_TEXT.contains("**Status:** Draft"))
    }

    @Test
    fun `the status line is parked and resumed on its own line and nothing else changes`() {
        val text = "# T\n\n**Status:** In Progress\n**Plan:** x\n"
        assertEquals("# T\n\n**Status:** Draft\n**Plan:** x\n", SmokeFiles.parkStatus(text))
        assertEquals(text, SmokeFiles.resumeStatus(SmokeFiles.parkStatus(text)))
        assertThrows(IllegalArgumentException::class.java) { SmokeFiles.parkStatus("# T\n") }
        assertThrows(IllegalArgumentException::class.java) { SmokeFiles.resumeStatus(text) }
    }
}
