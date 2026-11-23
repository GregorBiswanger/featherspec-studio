package com.gregorbiswanger.featherspec.studio.probe

import com.intellij.openapi.diagnostic.Logger

/** The one switch is the handover probe's `-Dfeatherspec.probe.handover=true`; without it every call returns at once. */
object OpenTimingProbe {
    private val LOG = Logger.getInstance(OpenTimingProbe::class.java)
    private val timings = OpenTimings()

    fun enabled(): Boolean = HandoverProperties.enabled()

    /** [owner] is the project service: it stands for the IDE project. */
    fun requested(owner: Any) {
        if (enabled()) {
            timings.requested(key(owner), System.nanoTime())
        }
    }

    fun begin(owner: Any): OpenMeasure? = if (enabled()) timings.editorCreated(key(owner), System.nanoTime()) else null

    fun closed(owner: Any, measure: OpenMeasure?) {
        if (measure != null) {
            timings.editorClosed(key(owner))
        }
    }

    fun contentShown(measure: OpenMeasure) {
        val line = measure.finish(System.nanoTime()) ?: return
        runCatching { LOG.info(line) }
    }

    private fun key(owner: Any): String = System.identityHashCode(owner).toString()
}
