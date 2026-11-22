package com.gregorbiswanger.featherspec.studio.settings

import com.gregorbiswanger.featherspec.studio.StudioProjectService
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.components.PersistentStateComponent
import com.intellij.openapi.components.Service
import com.intellij.openapi.components.State
import com.intellij.openapi.components.Storage
import com.intellij.openapi.project.ProjectManager
import com.intellij.util.xmlb.XmlSerializerUtil

@Service(Service.Level.APP)
@State(name = "FeatherSpecStudioSettings", storages = [Storage("featherspec-studio.xml")])
class StudioSettings : PersistentStateComponent<StudioSettings.State> {
    class State {
        var showStepTips: Boolean = SettingsTable.SHOW_STEP_TIPS_DEFAULT
        var strongModel: String = ""
        var fastModel: String = ""
        var assistant: String = SettingsTable.ASSISTANT_DEFAULT
    }

    private val current = State()

    override fun getState(): State = current

    override fun loadState(state: State) {
        synchronized(current) {
            XmlSerializerUtil.copyBean(state, current)
        }
    }

    fun model(): SettingsModel = synchronized(current) {
        SettingsTable.fromState(current.showStepTips, current.strongModel, current.fastModel, current.assistant)
    }

    fun apply(next: SettingsModel) {
        val clean = SettingsTable.sanitize(next)
        val events = synchronized(current) {
            val before = SettingsTable.fromState(current.showStepTips, current.strongModel, current.fastModel, current.assistant)
            current.showStepTips = clean.showStepTips
            current.strongModel = clean.strongModel
            current.fastModel = clean.fastModel
            current.assistant = clean.assistant
            SettingsTable.changeEvents(before, clean)
        }
        if (events.isNotEmpty()) {
            ApplicationManager.getApplication().executeOnPooledThread(Runnable { broadcast(events) })
        }
    }

    private fun broadcast(events: List<String>) {
        for (project in ProjectManager.getInstance().openProjects) {
            if (project.isDisposed) {
                continue
            }
            val service = project.getService(StudioProjectService::class.java)
            events.forEach { service.dispatchEvent("settingsChanged", it) }
        }
    }

    companion object {
        fun getInstance(): StudioSettings = ApplicationManager.getApplication().getService(StudioSettings::class.java)
    }
}
