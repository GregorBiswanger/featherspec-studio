package com.gregorbiswanger.featherspec.studio.probe

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class SmokeTraceTest {
    private fun stalls(vararg samples: Pair<Long, Long>): EdtStalls =
        EdtStalls().also { list -> samples.forEach { list.record(it.first, it.second) } }

    @Test
    fun `the worst round trip is taken from all samples or only those asked up to a point`() {
        val list = stalls(0L to 10L, 100L to 4000L, 5000L to 70L)
        assertEquals(4000L, list.max())
        assertEquals(10L, list.max(50L))
        assertEquals(-1L, EdtStalls().max())
        assertEquals(-1L, stalls(100L to 5L).max(50L))
    }

    @Test
    fun `the worst samples come first and a negative stall counts as zero`() {
        val list = stalls(1L to 5L, 2L to 900L, 3L to 40L, 4L to -3L)
        assertEquals(listOf(StallSample(2, 900), StallSample(3, 40)), list.worst(2))
        assertEquals(0L, list.worst(4).last().stallMs)
    }

    @Test
    fun `the trace measures from the open and a point that never happened is minus one`() {
        val open = 1_000_000_000L
        val trace = OpenTrace.of(open, open + 120_000_000L, open + 150_000_000L, stalls(10L to 100L, 400L to 900L))
        assertEquals(120L, trace.editorCreatedMs)
        assertEquals(150L, trace.placeholderAddedMs)
        assertEquals(900L, trace.edtMaxStallMs)
        assertEquals(100L, trace.edtMaxStallToPlaceholderMs)
        val never = OpenTrace.of(open, 0L, 0L, stalls(10L to 100L))
        assertEquals(-1L, never.editorCreatedMs)
        assertEquals(-1L, never.placeholderAddedMs)
        assertEquals(-1L, never.edtMaxStallToPlaceholderMs)
        assertEquals(100L, never.edtMaxStallMs)
    }

    @Test
    fun `an unarmed trace records nothing`() {
        SmokeTrace.disarm()
        SmokeTrace.arm()
        SmokeTrace.disarm()
        val before = SmokeTrace.editorNanos()
        SmokeTrace.editorCreated()
        SmokeTrace.placeholderAdded()
        assertEquals(before, SmokeTrace.editorNanos())
        assertEquals(0L, SmokeTrace.placeholderNanos())
    }

    @Test
    fun `an armed trace keeps the first moment only`() {
        SmokeTrace.arm()
        SmokeTrace.editorCreated()
        val first = SmokeTrace.editorNanos()
        SmokeTrace.editorCreated()
        SmokeTrace.disarm()
        assertTrue(first != 0L)
        assertEquals(first, SmokeTrace.editorNanos())
    }

    @Test
    fun `the edited spec is recognised whatever the separators or the case`() {
        assertTrue(SmokeTrace.samePath(".specs/a/b.md", ".specs\\A/./b.md"))
        assertTrue(!SmokeTrace.samePath(".specs/a/b.md", ".specs/a/c.md"))
        assertTrue(!SmokeTrace.samePath(null, ".specs/a/b.md"))
    }

    @Test
    fun `the change trace keeps the first moment, counts reads and ignores other paths`() {
        SmokeTrace.arm()
        SmokeTrace.editBegin(".specs/a/b.md")
        SmokeTrace.editVfs(".specs/other.md")
        assertEquals(0L, SmokeTrace.editVfsNanos())
        SmokeTrace.editVfs(".specs/a/b.md")
        val first = SmokeTrace.editVfsNanos()
        SmokeTrace.editVfs(".specs/a/b.md")
        SmokeTrace.editRead(".specs/a/b.md")
        SmokeTrace.editRead(".specs/a/b.md")
        SmokeTrace.editReadFailed(".specs/a/b.md")
        SmokeTrace.editRead(".specs/other.md")
        SmokeTrace.disarm()
        assertTrue(first != 0L)
        assertEquals(first, SmokeTrace.editVfsNanos())
        assertEquals(2, SmokeTrace.editReadCount())
        assertEquals(1, SmokeTrace.editReadFailureCount())
        assertEquals(0L, SmokeTrace.editDispatchNanos())
        val trace = EditTrace.of(first - 5_000_000L)
        assertEquals(5L, trace.vfsMs)
        assertEquals(-1L, trace.dispatchMs)
        assertEquals(2, trace.reads)
    }

    @Test
    fun `an unarmed change trace records nothing and begin forgets the earlier stamps`() {
        SmokeTrace.arm()
        SmokeTrace.editBegin(".specs/a/b.md")
        SmokeTrace.editDispatched(".specs/a/b.md")
        SmokeTrace.disarm()
        assertTrue(SmokeTrace.editDispatchNanos() != 0L)
        SmokeTrace.editBegin(".specs/a/b.md")
        assertEquals(0L, SmokeTrace.editDispatchNanos())
        SmokeTrace.editDispatched(".specs/a/b.md")
        SmokeTrace.editRead(".specs/a/b.md")
        assertEquals(0L, SmokeTrace.editDispatchNanos())
        assertEquals(0, SmokeTrace.editReadCount())
    }
}
