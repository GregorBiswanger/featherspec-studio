package com.gregorbiswanger.featherspec.studio.probe

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class OpenTimingTest {
    private val A = "project-a"
    private val B = "project-b"

    private fun ms(value: Long) = value * 1_000_000L

    @Test
    fun `the line is the one Gregor greps for`() {
        assertEquals("FEATHERSPEC-TIMING open\u2192first-content 842 (cold)", OpenTimingLine.format(842, true))
        assertEquals("FEATHERSPEC-TIMING open\u2192first-content 37 (warm)", OpenTimingLine.format(37, false))
    }

    @Test
    fun `the first open of the process is cold, every later one warm`() {
        val timings = OpenTimings()
        assertTrue(timings.editorCreated(A, ms(10)).cold)
        assertFalse(timings.editorCreated(A, ms(20)).cold)
        assertFalse(timings.editorCreated(A, ms(30)).cold)
    }

    @Test
    fun `the time runs from the request, not from the creation of the editor`() {
        val timings = OpenTimings()
        timings.requested(A, ms(1_000))
        val measure = timings.editorCreated(A, ms(1_300))
        assertEquals("FEATHERSPEC-TIMING open\u2192first-content 500 (cold)", measure.finish(ms(1_500)))
    }

    @Test
    fun `a restored tab has no request and runs from the creation of the editor`() {
        val timings = OpenTimings()
        val measure = timings.editorCreated(A, ms(2_000))
        assertEquals("FEATHERSPEC-TIMING open\u2192first-content 120 (cold)", measure.finish(ms(2_120)))
    }

    @Test
    fun `a request is used by one editor only`() {
        val timings = OpenTimings()
        timings.requested(A, ms(100))
        timings.editorCreated(A, ms(150))
        val next = timings.editorCreated(A, ms(5_000))
        assertEquals("FEATHERSPEC-TIMING open\u2192first-content 10 (warm)", next.finish(ms(5_010)))
    }

    @Test
    fun `the latest request before the editor exists wins, so an old one that no editor took cannot inflate the time`() {
        val timings = OpenTimings()
        timings.requested(A, ms(100))
        timings.requested(A, ms(400))
        assertEquals("FEATHERSPEC-TIMING open\u2192first-content 100 (cold)", timings.editorCreated(A, ms(450)).finish(ms(500)))
    }

    @Test
    fun `an open writes exactly one line`() {
        val measure = OpenTimings().editorCreated(A, ms(0))
        assertFalse(measure.done)
        assertEquals("FEATHERSPEC-TIMING open\u2192first-content 5 (cold)", measure.finish(ms(5)))
        assertTrue(measure.done)
        assertNull(measure.finish(ms(9)))
        assertNull(measure.finish(ms(50)))
    }

    @Test
    fun `a clock that runs backwards gives zero, never a negative time`() {
        assertEquals("FEATHERSPEC-TIMING open\u2192first-content 0 (cold)", OpenTimings().editorCreated(A, ms(50)).finish(ms(40)))
    }

    @Test
    fun `a start at nano time zero is a real start`() {
        val timings = OpenTimings()
        timings.requested(A, 0L)
        assertEquals("FEATHERSPEC-TIMING open\u2192first-content 70 (cold)", timings.editorCreated(A, ms(30)).finish(ms(70)))
    }

    @Test
    fun `a request while the tab is already open is no open and cannot inflate the next one`() {
        val timings = OpenTimings()
        timings.editorCreated(A, ms(0))
        timings.requested(A, ms(100))
        timings.editorClosed(A)
        assertEquals("FEATHERSPEC-TIMING open\u2192first-content 4 (warm)", timings.editorCreated(A, ms(900)).finish(ms(904)))
    }

    @Test
    fun `after the tab is closed a request counts again`() {
        val timings = OpenTimings()
        timings.editorCreated(A, ms(0))
        timings.editorClosed(A)
        timings.requested(A, ms(1_000))
        assertEquals("FEATHERSPEC-TIMING open\u2192first-content 250 (warm)", timings.editorCreated(A, ms(1_100)).finish(ms(1_250)))
    }

    @Test
    fun `projects do not share a request or an open tab, only the cold start`() {
        val timings = OpenTimings()
        timings.editorCreated(A, ms(0))
        timings.requested(B, ms(500))
        timings.requested(A, ms(600))
        val other = timings.editorCreated(B, ms(700))
        assertFalse(other.cold)
        assertEquals("FEATHERSPEC-TIMING open\u2192first-content 300 (warm)", other.finish(ms(800)))
    }

    @Test
    fun `closing a tab that was never counted does not go below zero`() {
        val timings = OpenTimings()
        timings.editorClosed(A)
        timings.requested(A, ms(10))
        assertEquals("FEATHERSPEC-TIMING open\u2192first-content 15 (cold)", timings.editorCreated(A, ms(20)).finish(ms(25)))
    }

    @Test
    fun `a request older than a minute is stale and the editor runs from its own creation`() {
        val timings = OpenTimings()
        timings.requested(A, ms(0))
        assertEquals("FEATHERSPEC-TIMING open\u2192first-content 8 (cold)", timings.editorCreated(A, ms(60_001)).finish(ms(60_009)))
        val fresh = OpenTimings()
        fresh.requested(A, ms(0))
        assertEquals("FEATHERSPEC-TIMING open\u2192first-content 60008 (cold)", fresh.editorCreated(A, ms(60_000)).finish(ms(60_008)))
    }
}
