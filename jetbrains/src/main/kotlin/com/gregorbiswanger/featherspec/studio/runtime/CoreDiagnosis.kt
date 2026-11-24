package com.gregorbiswanger.featherspec.studio.runtime

object CoreDiagnosis {
    fun describe(
        createdAtNanos: Long,
        loadedAtNanos: Long,
        configAtNanos: Long,
        startSentAtNanos: Long,
        firstFrameAtNanos: Long,
    ): String {
        fun step(label: String, atNanos: Long): String =
            if (atNanos == 0L) "$label: no" else "$label: yes${offset(createdAtNanos, atNanos)}"
        return listOf(
            "Diagnosis - browser created: ${if (createdAtNanos == 0L) "no" else "yes"}",
            step("core page loaded", loadedAtNanos),
            step("config received", configAtNanos),
            step("start sent", startSentAtNanos),
            step("first frame from the core", firstFrameAtNanos),
        ).joinToString("; ") + "."
    }

    private fun offset(baseNanos: Long, atNanos: Long): String {
        if (baseNanos == 0L) {
            return ""
        }
        val millis = (atNanos - baseNanos) / 1_000_000L
        return " (" + (if (millis >= 0) "+" else "") + millis + " ms)"
    }
}
