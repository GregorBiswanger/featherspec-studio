package com.gregorbiswanger.featherspec.studio.theme

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.awt.Color

class ContrastTest {
    @Test
    fun `black on white is 21 and equal colours are 1`() {
        assertEquals(21.0, Contrast.ratio(Color.BLACK, Color.WHITE), 0.0001)
        assertEquals(21.0, Contrast.ratio(Color.WHITE, Color.BLACK), 0.0001)
        assertEquals(1.0, Contrast.ratio(Color(0x33, 0x66, 0x99), Color(0x33, 0x66, 0x99)), 0.0001)
    }

    @Test
    fun `hex and rgba values parse and anything else does not`() {
        assertEquals(Color(1, 2, 3, 255), Contrast.parse("#010203"))
        assertEquals(Color(1, 2, 3, 128), Contrast.parse("rgba(1, 2, 3, 0.502)"))
        assertNull(Contrast.parse("initial"))
        assertNull(Contrast.parse("transparent"))
        assertNull(Contrast.parse("rgba(300, 2, 3, 0.5)"))
        assertNull(Contrast.parse("rgba(1, 2, 3, 1.5)"))
    }

    @Test
    fun `every pair of the table holds its minimum for the values of each kind with an all-null lookup`() {
        for (kind in ThemeKind.entries) {
            val report = Contrast.check(ThemeMapping.variables({ null }, kind))
            assertEquals(emptyList<String>(), report.failures, kind.name)
            assertEquals(emptyList<String>(), report.skipped, kind.name)
            assertEquals(ThemeMapping.contrastPairs.size, report.evaluated, kind.name)
        }
    }

    @Test
    fun `a pair below its minimum is named with its ratio`() {
        val values = mapOf("--vscode-foreground" to "#777777", "--vscode-editor-background" to "#808080")
        val pairs = listOf(ContrastPair("--vscode-foreground", "--vscode-editor-background", 4.5))
        val report = Contrast.check(values, pairs)
        assertEquals(1, report.evaluated)
        assertEquals(1, report.failures.size)
        assertTrue(report.failures.single().startsWith("--vscode-foreground on --vscode-editor-background: 1."), report.failures.single())
        assertTrue(report.failures.single().endsWith("is below 4.5"), report.failures.single())
    }

    @Test
    fun `a missing, unreadable or translucent colour is skipped, not counted as passed`() {
        val pairs = listOf(
            ContrastPair("--a", "--b", 4.5),
            ContrastPair("--c", "--d", 4.5),
            ContrastPair("--e", "--f", 4.5),
        )
        val values = mapOf(
            "--a" to "#000000",
            "--c" to "initial",
            "--d" to "#ffffff",
            "--e" to "#000000",
            "--f" to "rgba(255, 255, 255, 0.500)",
        )
        val report = Contrast.check(values, pairs)
        assertEquals(0, report.evaluated)
        assertEquals(emptyList<String>(), report.failures)
        assertEquals(listOf("--a on --b", "--c on --d", "--e on --f"), report.skipped)
    }
}
