package com.gregorbiswanger.featherspec.studio.jcef

enum class Availability { AVAILABLE, UNSUPPORTED, SUSPENDED, PENDING }

object JcefAvailability {
    const val SUSPENDED_AFTER_MS = 30_000L

    fun decide(supported: Boolean, loadedAfterMs: Long?, waitedMs: Long): Availability = when {
        !supported -> Availability.UNSUPPORTED
        loadedAfterMs != null -> Availability.AVAILABLE
        waitedMs >= SUSPENDED_AFTER_MS -> Availability.SUSPENDED
        else -> Availability.PENDING
    }
}
