package com.gregorbiswanger.featherspec.studio.probe

object OpenTimingLine {
    const val PREFIX = "FEATHERSPEC-TIMING"
    const val NAME = "open\u2192first-content"

    fun format(ms: Long, cold: Boolean): String = "$PREFIX $NAME $ms (${if (cold) "cold" else "warm"})"
}

class OpenMeasure(val startNanos: Long, val cold: Boolean) {
    private var finished = false

    val done: Boolean
        @Synchronized get() = finished

    @Synchronized
    fun finish(nowNanos: Long): String? {
        if (finished) {
            return null
        }
        finished = true
        val ms = ((nowNanos - startNanos) / NANOS_PER_MS).coerceAtLeast(0L)
        return OpenTimingLine.format(ms, cold)
    }

    private companion object {
        const val NANOS_PER_MS = 1_000_000L
    }
}

/**
 * The open of the Studio tab, free of the platform. [project] names the IDE project: a request and an open tab belong to
 * one project, only "the first open" is shared by the whole IDE process.
 */
class OpenTimings {
    private val requestedAt = HashMap<String, Long>()
    private val openTabs = HashMap<String, Int>()
    private var opened = false

    /** The latest request wins. While the tab is open a request is no open, so it is ignored. */
    @Synchronized
    fun requested(project: String, nowNanos: Long) {
        if ((openTabs[project] ?: 0) == 0) {
            requestedAt[project] = nowNanos
        }
    }

    @Synchronized
    fun editorClosed(project: String) {
        val left = (openTabs[project] ?: 0) - 1
        if (left > 0) {
            openTabs[project] = left
        } else {
            openTabs.remove(project)
        }
    }

    @Synchronized
    fun editorCreated(project: String, nowNanos: Long): OpenMeasure {
        val asked = requestedAt.remove(project)
        val start = if (asked != null && nowNanos - asked <= MAX_REQUEST_AGE_NANOS) asked else nowNanos
        openTabs[project] = (openTabs[project] ?: 0) + 1
        val cold = !opened
        opened = true
        return OpenMeasure(start, cold)
    }

    private companion object {
        const val MAX_REQUEST_AGE_NANOS = 60_000L * 1_000_000L
    }
}
