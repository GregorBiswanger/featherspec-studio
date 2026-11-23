package com.gregorbiswanger.featherspec.studio.panel

import com.gregorbiswanger.featherspec.studio.HostTexts

object LoadingPlaceholderText {
    val shown: String = HostTexts.LOADING
    val accessibleName: String = HostTexts.LOADING
}

class LoadingCover {
    var covering = false
        private set

    fun put() {
        covering = true
    }

    fun frame(type: String): Boolean {
        if (!covering || type != SHELL_FRAME) {
            return false
        }
        covering = false
        return true
    }

    fun lift() {
        covering = false
    }

    private companion object {
        const val SHELL_FRAME = "shell"
    }
}

class DeferredStart(private val schedule: (() -> Unit) -> Unit) {
    private var generation = 0
    private var pending = false

    val waiting: Boolean
        get() = pending

    fun request(block: () -> Unit) {
        if (pending) {
            return
        }
        pending = true
        val mine = generation
        schedule {
            if (generation == mine && pending) {
                pending = false
                block()
            }
        }
    }

    fun cancel() {
        generation += 1
        pending = false
    }
}
