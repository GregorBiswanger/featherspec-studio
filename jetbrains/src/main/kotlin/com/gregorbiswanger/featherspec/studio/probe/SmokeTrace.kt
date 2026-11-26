package com.gregorbiswanger.featherspec.studio.probe

import java.util.concurrent.atomic.AtomicInteger
import java.util.concurrent.atomic.AtomicLong

/** The first editor and placeholder of an armed smoke run. Only [SmokeProbe] arms it, so without the probe switch every call returns at once. */
object SmokeTrace {
    @Volatile
    private var armed = false
    private val editorAt = AtomicLong(0L)
    private val placeholderAt = AtomicLong(0L)
    private val themeNotifiedAt = AtomicLong(0L)
    private val themeSentAt = AtomicLong(0L)
    private val themeRefreshAt = AtomicLong(0L)

    // The in-IDE change of the edited spec: where the change passes the plugin on its way to the core (AC-020).
    @Volatile
    private var editTarget: String? = null
    private val editVfsAt = AtomicLong(0L)
    private val editDocAt = AtomicLong(0L)
    private val editWatcherAt = AtomicLong(0L)
    private val editDispatchAt = AtomicLong(0L)
    private val editScanAt = AtomicLong(0L)
    private val editReadAt = AtomicLong(0L)
    private val editReads = AtomicInteger(0)
    private val editReadFailures = AtomicInteger(0)

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

    /** The same spec path whatever the separators, a leading "./" or the case (the OS may fold it). */
    fun samePath(target: String?, path: String): Boolean =
        target != null && parts(target) == parts(path)

    private fun parts(path: String): List<String> =
        path.replace('\\', '/').split('/').filter { it.isNotEmpty() && it != "." }.map { it.lowercase() }

    /** Starts the trace of one in-IDE change of [relativePath]: forgets every earlier stamp. Call it right before the change. */
    fun editBegin(relativePath: String) {
        editTarget = relativePath
        editVfsAt.set(0L)
        editDocAt.set(0L)
        editWatcherAt.set(0L)
        editDispatchAt.set(0L)
        editScanAt.set(0L)
        editReadAt.set(0L)
        editReads.set(0)
        editReadFailures.set(0)
    }

    /** SpecWatch received the VFS event of the spec. */
    fun editVfs(relativePath: String) = stamp(editVfsAt, relativePath)

    /** SpecWatch received a document event of the spec. */
    fun editDocument(relativePath: String) = stamp(editDocAt, relativePath)

    /** The file watcher (RootWatcher) reported the spec. */
    fun editWatcher(relativePath: String) = stamp(editWatcherAt, relativePath)

    /** The change of the spec was handed to the core. */
    fun editDispatched(relativePath: String) = stamp(editDispatchAt, relativePath)

    /** The host answered the core's first scan of the project folders after [editBegin]. */
    fun editScanned() {
        if (armed) {
            editScanAt.compareAndSet(0L, System.nanoTime())
        }
    }

    /** The core read the spec through the host port; the first read is stamped, all are counted. */
    fun editRead(relativePath: String) {
        if (armed && samePath(editTarget, relativePath)) {
            editReadAt.compareAndSet(0L, System.nanoTime())
            editReads.incrementAndGet()
        }
    }

    /** A read of the spec failed (the port itself never retries, the core may ask again). */
    fun editReadFailed(relativePath: String) {
        if (armed && samePath(editTarget, relativePath)) {
            editReadFailures.incrementAndGet()
        }
    }

    private fun stamp(at: AtomicLong, relativePath: String) {
        if (armed && samePath(editTarget, relativePath)) {
            at.compareAndSet(0L, System.nanoTime())
        }
    }

    fun editVfsNanos(): Long = editVfsAt.get()

    fun editDocumentNanos(): Long = editDocAt.get()

    fun editWatcherNanos(): Long = editWatcherAt.get()

    fun editDispatchNanos(): Long = editDispatchAt.get()

    fun editScanNanos(): Long = editScanAt.get()

    fun editReadNanos(): Long = editReadAt.get()

    fun editReadCount(): Int = editReads.get()

    fun editReadFailureCount(): Int = editReadFailures.get()

    fun themeReset() {
        themeNotifiedAt.set(0L)
        themeSentAt.set(0L)
        themeRefreshAt.set(0L)
    }

    fun themeNotified() {
        if (armed) {
            themeNotifiedAt.compareAndSet(0L, System.nanoTime())
        }
    }

    fun themeRefreshStarted() {
        if (armed) {
            themeRefreshAt.compareAndSet(0L, System.nanoTime())
        }
    }

    fun themeSent() {
        if (armed) {
            themeSentAt.compareAndSet(0L, System.nanoTime())
        }
    }

    fun themeNotifiedNanos(): Long = themeNotifiedAt.get()

    fun themeSentNanos(): Long = themeSentAt.get()

    fun themeRefreshNanos(): Long = themeRefreshAt.get()

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

/** Where the in-IDE change of the edited spec was seen, in ms after the save; a point that never happened is -1. */
data class EditTrace(
    val vfsMs: Long,
    val documentMs: Long,
    val watcherMs: Long,
    val dispatchMs: Long,
    val scanMs: Long,
    val readMs: Long,
    val reads: Int,
    val readFailures: Int,
) {
    companion object {
        val NONE = EditTrace(-1L, -1L, -1L, -1L, -1L, -1L, 0, 0)

        /** [startNanos] is the moment before the save; the stamps are those of [SmokeTrace]. */
        fun of(startNanos: Long): EditTrace = EditTrace(
            vfsMs = Budgets.elapsedMs(startNanos, SmokeTrace.editVfsNanos()),
            documentMs = Budgets.elapsedMs(startNanos, SmokeTrace.editDocumentNanos()),
            watcherMs = Budgets.elapsedMs(startNanos, SmokeTrace.editWatcherNanos()),
            dispatchMs = Budgets.elapsedMs(startNanos, SmokeTrace.editDispatchNanos()),
            scanMs = Budgets.elapsedMs(startNanos, SmokeTrace.editScanNanos()),
            readMs = Budgets.elapsedMs(startNanos, SmokeTrace.editReadNanos()),
            reads = SmokeTrace.editReadCount(),
            readFailures = SmokeTrace.editReadFailureCount(),
        )
    }
}
