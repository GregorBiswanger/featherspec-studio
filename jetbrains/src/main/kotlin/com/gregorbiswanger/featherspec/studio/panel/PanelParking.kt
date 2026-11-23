package com.gregorbiswanger.featherspec.studio.panel

/** One slot for the panel browser of a closed Studio tab. Park-and-take rules only, free of the platform. */
class PanelParking<T : Any>(private val alive: (T) -> Boolean, private val discard: (T) -> Unit) {
    private var parked: T? = null
    private var closed = false

    val occupied: Boolean
        @Synchronized get() = parked != null

    val shut: Boolean
        @Synchronized get() = closed

    /** False when the caller keeps the item and has to dispose it: the slot is taken, shut, or the item is dead. */
    @Synchronized
    fun park(item: T): Boolean {
        if (closed || parked != null || !alive(item)) {
            return false
        }
        parked = item
        return true
    }

    @Synchronized
    fun take(): T? {
        val item = parked ?: return null
        parked = null
        if (!alive(item)) {
            discard(item)
            return null
        }
        return item
    }

    @Synchronized
    fun clear() {
        val item = parked ?: return
        parked = null
        discard(item)
    }

    @Synchronized
    fun close() {
        closed = true
        clear()
    }
}

object ParkRule {
    fun parkable(ready: Boolean, failed: Boolean, shellSeen: Boolean, dead: Boolean): Boolean =
        ready && !failed && shellSeen && !dead
}
