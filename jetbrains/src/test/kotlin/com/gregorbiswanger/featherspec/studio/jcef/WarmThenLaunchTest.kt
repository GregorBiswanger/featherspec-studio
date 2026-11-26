package com.gregorbiswanger.featherspec.studio.jcef

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class WarmThenLaunchTest {
    private val log = mutableListOf<String>()
    private val background = mutableListOf<() -> Unit>()
    private val edt = mutableListOf<() -> Unit>()

    private fun sequence(disposed: () -> Boolean = { false }, warm: () -> Unit = { log.add("warm") }) =
        WarmThenLaunch({ background.add(it) }, { edt.add(it) }, disposed, warm, { log.add("launch") })

    @Test
    fun `warm-up runs in the background and launch is queued on the EDT only after it`() {
        sequence().run()
        assertEquals(emptyList<String>(), log)
        assertEquals(0, edt.size)
        background.removeAt(0)()
        assertEquals(listOf("warm"), log)
        assertEquals(1, edt.size)
        edt.removeAt(0)()
        assertEquals(listOf("warm", "launch"), log)
    }

    @Test
    fun `a failing warm-up still queues the launch`() {
        sequence(warm = { throw IllegalStateException("jcef") }).run()
        background.removeAt(0)()
        assertEquals(1, edt.size)
        edt.removeAt(0)()
        assertEquals(listOf("launch"), log)
    }

    @Test
    fun `a disposed owner queues no launch`() {
        var gone = false
        sequence(disposed = { gone }).run()
        gone = true
        background.removeAt(0)()
        assertEquals(0, edt.size)
        assertEquals(listOf("warm"), log)
    }
}
