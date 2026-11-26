package com.gregorbiswanger.featherspec.studio.jcef

import com.gregorbiswanger.featherspec.studio.runtime.CoreState
import com.gregorbiswanger.featherspec.studio.runtime.UnavailableKind

enum class Availability { AVAILABLE, UNSUPPORTED, SUSPENDED, PENDING }

object JcefAvailability {
    const val SUSPENDED_AFTER_MS = 30_000L

    fun decide(supported: Boolean, loadedAfterMs: Long?, waitedMs: Long): Availability = when {
        !supported -> Availability.UNSUPPORTED
        loadedAfterMs != null -> Availability.AVAILABLE
        waitedMs >= SUSPENDED_AFTER_MS -> Availability.SUSPENDED
        else -> Availability.PENDING
    }

    /**
     * The state the core moves to, given the current one, whether its page has loaded and how long it has been waiting.
     * A page that has not loaded after [SUSPENDED_AFTER_MS] only shows the suspended hint; the core is kept, so a page
     * that loads later takes the state from SUSPENDED back to Loading and on the normal path to Ready.
     */
    fun nextState(current: CoreState, loaded: Boolean, waitedMs: Long): CoreState = when {
        current == CoreState.Loading ->
            if (!loaded && waitedMs >= SUSPENDED_AFTER_MS) CoreState.Unavailable(UnavailableKind.SUSPENDED) else current
        current == CoreState.Unavailable(UnavailableKind.SUSPENDED) && loaded -> CoreState.Loading
        else -> current
    }
}
