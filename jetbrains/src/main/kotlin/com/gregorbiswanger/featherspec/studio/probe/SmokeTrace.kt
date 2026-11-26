package com.gregorbiswanger.featherspec.studio.probe

import java.util.concurrent.atomic.AtomicLong

/** The first editor and placeholder of an armed smoke run. Only [SmokeProbe] arms it, so without the probe switch every call returns at once. */
object SmokeTrace {
    @Volatile
    private var armed = false
    private val editorAt = AtomicLong(0L)
    private val placeholderAt = AtomicLong(0L)
    private val themeNotifiedAt = AtomicLong(0L)
    private val themeSentAt = AtomicLong(0L)

    fun arm() {
        editorAt.set(0L)
        placeholderAt.set(0L)
        themeReset()
        armed = true
    }

    fun disarm() {
        armed = false
    }

    fun editorCreated() {
        if (armed) {
            editorAt.compareAndSet(0L, System.nanoTime())
        }
    }

    fun placeholderAdded() {
        if (armed) {
            placeholderAt.compareAndSet(0L, System.nanoTime())
        }
    }

    fun themeReset() {
        themeNotifiedAt.set(0L)
        themeSentAt.set(0L)
    }

    fun themeNotified() {
        if (armed) {
            themeNotifiedAt.compareAndSet(0L, System.nanoTime())
        }
    }

    fun themeSent() {
        if (armed) {
            themeSentAt.compareAndSet(0L, System.nanoTime())
        }
    }

    fun themeNotifiedNanos(): Long = themeNotifiedAt.get()

    fun themeSentNanos(): Long = themeSentAt.get()

    fun editorNanos(): Long = editorAt.get()

    fun placeholderNanos(): Long = placeholderAt.get()
}

data class StallSample(val atMs: Long, val stallMs: Long)

/** Round trips of the event thread: [atMs] is when the probe asked, [stallMs] how long the answer took. */
class EdtStalls {
    private val samples = ArrayList<StallSample>()

    @Synchronized
    fun record(atMs: Long, stallMs: Long) {
        samples.add(StallSample(atMs, stallMs.coerceAtLeast(0L)))
    }

    /** The worst answer to a question asked up to [untilMs]; -1 when there was none. */
    @Synchronized
    fun max(untilMs: Long = Long.MAX_VALUE): Long =
        samples.filter { it.atMs <= untilMs }.maxOfOrNull { it.stallMs } ?: -1L

    @Synchronized
    fun worst(count: Int): List<StallSample> = samples.sortedByDescending { it.stallMs }.take(count)
}

data class OpenTrace(
    val editorCreatedMs: Long,
    val placeholderAddedMs: Long,
    val edtMaxStallMs: Long,
    val edtMaxStallToPlaceholderMs: Long,
    val edtStallSamples: List<StallSample>,
) {
    companion object {
        const val SAMPLES = 3
        val NONE = OpenTrace(-1L, -1L, -1L, -1L, emptyList())

        /** [openedNanos] is the openFile call; a point that never happened (0) is -1. */
        fun of(openedNanos: Long, editorNanos: Long, placeholderNanos: Long, stalls: EdtStalls): OpenTrace {
            val placeholderMs = since(openedNanos, placeholderNanos)
            return OpenTrace(
                editorCreatedMs = since(openedNanos, editorNanos),
                placeholderAddedMs = placeholderMs,
                edtMaxStallMs = stalls.max(),
                edtMaxStallToPlaceholderMs = if (placeholderMs < 0) -1L else stalls.max(placeholderMs),
                edtStallSamples = stalls.worst(SAMPLES),
            )
        }

        private fun since(openedNanos: Long, nanos: Long): Long = Budgets.elapsedMs(openedNanos, nanos)
    }
}
