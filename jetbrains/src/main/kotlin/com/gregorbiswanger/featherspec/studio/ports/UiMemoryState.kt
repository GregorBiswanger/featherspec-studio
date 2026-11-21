package com.gregorbiswanger.featherspec.studio.ports

import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.components.PersistentStateComponent
import com.intellij.openapi.components.Service
import com.intellij.openapi.components.State
import com.intellij.openapi.components.Storage

@Service(Service.Level.APP)
@State(name = "FeatherSpecStudioMemory", storages = [Storage("featherspec-studio-memory.xml")])
class UiMemoryState : PersistentStateComponent<UiMemoryState.State> {
    class State {
        var entries: MutableMap<String, String> = HashMap()
    }

    private val current = State()

    val memory: UiMemory = UiMemory(current.entries)

    override fun getState(): State = current

    override fun loadState(state: State) {
        synchronized(current.entries) {
            current.entries.clear()
            current.entries.putAll(state.entries)
        }
    }

    companion object {
        fun getInstance(): UiMemoryState = ApplicationManager.getApplication().getService(UiMemoryState::class.java)
    }
}
