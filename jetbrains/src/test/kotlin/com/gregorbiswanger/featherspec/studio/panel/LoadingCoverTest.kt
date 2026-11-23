package com.gregorbiswanger.featherspec.studio.panel

import com.gregorbiswanger.featherspec.studio.HostTexts
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class LoadingCoverTest {
    @Test
    fun `AC-041 the placeholder text is the literal loading text`() {
        assertEquals("Loading project…", HostTexts.LOADING)
        assertEquals(HostTexts.LOADING, LoadingPlaceholderText.shown)
        assertEquals(HostTexts.LOADING, LoadingPlaceholderText.accessibleName)
    }

    @Test
    fun `AC-041 a cover that was put on stays until the shell frame arrives`() {
        val cover = LoadingCover()
        assertFalse(cover.covering)
        cover.put()
        assertTrue(cover.covering)
        assertFalse(cover.frame("dashboard"))
        assertFalse(cover.frame(""))
        assertTrue(cover.covering)
        assertTrue(cover.frame("shell"))
        assertFalse(cover.covering)
    }

    @Test
    fun `AC-041 the shell frame lifts the cover once`() {
        val cover = LoadingCover()
        cover.put()
        assertTrue(cover.frame("shell"))
        assertFalse(cover.frame("shell"))
    }

    @Test
    fun `AC-041 a shell frame without a cover lifts nothing`() {
        assertFalse(LoadingCover().frame("shell"))
    }

    @Test
    fun `AC-041 the open counts as content while the placeholder is drawn, also over the browser`() {
        assertTrue(PanelViews.contentVisible(PanelView.Loading, covering = false))
        assertTrue(PanelViews.contentVisible(PanelView.Browser, covering = true))
        assertFalse(PanelViews.contentVisible(PanelView.Browser, covering = false))
        assertTrue(PanelViews.contentVisible(PanelView.Failed("x"), covering = false))
    }

    @Test
    fun `AC-041 the browser start waits for a later turn and is dropped when cancelled`() {
        val queue = ArrayList<() -> Unit>()
        val start = DeferredStart { queue.add(it) }
        var ran = 0
        start.request { ran += 1 }
        assertEquals(0, ran)
        assertEquals(1, queue.size)
        queue.removeAt(0)()
        assertEquals(1, ran)

        start.request { ran += 1 }
        start.cancel()
        queue.removeAt(0)()
        assertEquals(1, ran)
    }

    @Test
    fun `AC-041 a second request while one waits starts nothing twice`() {
        val queue = ArrayList<() -> Unit>()
        val start = DeferredStart { queue.add(it) }
        var ran = 0
        start.request { ran += 1 }
        start.request { ran += 1 }
        assertEquals(1, queue.size)
        queue.forEach { it() }
        assertEquals(1, ran)
        assertFalse(start.waiting)
    }
}
