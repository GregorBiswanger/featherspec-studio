package com.gregorbiswanger.featherspec.studio.theme

import java.awt.Color
import java.util.Locale

data class ContrastReport(val evaluated: Int, val failures: List<String>, val skipped: List<String>)

object Contrast {
    private val RGBA = Regex("""^rgba\((\d{1,3}), (\d{1,3}), (\d{1,3}), ([0-9.]+)\)$""")

    fun ratio(first: Color, second: Color): Double = ThemeMapping.contrastRatio(first, second)

    fun parse(css: String): Color? {
        val text = css.trim()
        ThemeMapping.parseHex(text)?.let { return it }
        val match = RGBA.matchEntire(text) ?: return null
        val red = match.groupValues[1].toInt()
        val green = match.groupValues[2].toInt()
        val blue = match.groupValues[3].toInt()
        val alpha = match.groupValues[4].toDoubleOrNull() ?: return null
        if (red > 255 || green > 255 || blue > 255 || alpha < 0.0 || alpha > 1.0) {
            return null
        }
        return Color(red, green, blue, Math.round(alpha * 255).toInt())
    }

    fun check(values: Map<String, String>, pairs: List<ContrastPair> = ThemeMapping.contrastPairs): ContrastReport {
        var evaluated = 0
        val failures = ArrayList<String>()
        val skipped = ArrayList<String>()
        for (pair in pairs) {
            val name = "${pair.foreground} on ${pair.background}"
            val foreground = values[pair.foreground]?.let { parse(it) }
            val background = values[pair.background]?.let { parse(it) }
            if (foreground == null || background == null || background.alpha < 255) {
                skipped.add(name)
                continue
            }
            evaluated += 1
            val ratio = ratio(foreground, background)
            if (ratio < pair.minimum) {
                failures.add(String.format(Locale.ROOT, "%s: %.2f is below %.1f", name, ratio, pair.minimum))
            }
        }
        return ContrastReport(evaluated, failures, skipped)
    }
}
