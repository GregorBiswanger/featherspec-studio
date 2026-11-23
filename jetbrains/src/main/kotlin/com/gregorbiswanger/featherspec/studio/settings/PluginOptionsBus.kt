package com.gregorbiswanger.featherspec.studio.settings

import java.util.concurrent.CopyOnWriteArrayList

class PluginOptionsBus {
    private val listeners = CopyOnWriteArrayList<(List<String>) -> Unit>()

    fun subscribe(listener: (List<String>) -> Unit): () -> Unit {
        listeners.add(listener)
        return { listeners.remove(listener) }
    }

    fun publish(plugins: List<String>) {
        listeners.forEach { it(plugins) }
    }

    companion object {
        val shared = PluginOptionsBus()
    }
}
