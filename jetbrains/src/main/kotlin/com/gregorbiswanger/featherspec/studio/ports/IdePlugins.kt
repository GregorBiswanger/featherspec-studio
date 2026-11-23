package com.gregorbiswanger.featherspec.studio.ports

import com.gregorbiswanger.featherspec.studio.StudioProjectService
import com.gregorbiswanger.featherspec.studio.settings.PluginOptionsBus
import com.intellij.ide.plugins.DynamicPluginListener
import com.intellij.ide.plugins.IdeaPluginDescriptor
import com.intellij.ide.plugins.PluginManagerCore
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.diagnostic.thisLogger
import com.intellij.openapi.extensions.PluginId
import com.intellij.openapi.progress.ProcessCanceledException
import com.intellij.openapi.project.ProjectManager

class IdePlugins : PluginQuery {
    override fun available(id: String): Boolean = try {
        val pluginId = PluginId.getId(id)
        PluginManagerCore.isPluginInstalled(pluginId) && loaded(pluginId)
    } catch (cancelled: ProcessCanceledException) {
        throw cancelled
    } catch (failure: RuntimeException) {
        thisLogger().warn("The plugin $id could not be asked", failure)
        false
    } catch (failure: LinkageError) {
        thisLogger().warn("The plugin $id could not be asked", failure)
        false
    }

    private fun loaded(pluginId: PluginId): Boolean = try {
        PluginManagerCore.isLoaded(pluginId)
    } catch (failure: LinkageError) {
        true
    }

    fun snapshot(absent: Set<String> = emptySet()): List<String> = PluginAvailability.snapshot(this, absent)
}

class PluginEvents : DynamicPluginListener {
    override fun pluginLoaded(pluginDescriptor: IdeaPluginDescriptor) {
        report(PluginEventKind.LOADED, pluginDescriptor, false)
    }

    override fun pluginUnloaded(pluginDescriptor: IdeaPluginDescriptor, isUpdate: Boolean) {
        report(PluginEventKind.UNLOADED, pluginDescriptor, isUpdate)
    }

    private fun report(kind: PluginEventKind, descriptor: IdeaPluginDescriptor, isUpdate: Boolean) {
        val id = descriptor.pluginId.idString
        if (id !in PluginIds.ALL || !PluginAvailability.recompute(kind, isUpdate)) {
            return
        }
        val absent = PluginAvailability.absentAfter(kind, id, isUpdate)
        ApplicationManager.getApplication().executeOnPooledThread(Runnable { broadcast(absent) })
    }

    private fun broadcast(absent: Set<String>) {
        try {
            val plugins = IdePlugins().snapshot(absent)
            for (project in ProjectManager.getInstance().openProjects) {
                if (!project.isDisposed) {
                    project.getService(StudioProjectService::class.java).sendPlugins(plugins)
                }
            }
            PluginOptionsBus.shared.publish(plugins)
        } catch (cancelled: ProcessCanceledException) {
            throw cancelled
        } catch (failure: RuntimeException) {
            thisLogger().warn("The FeatherSpec plugin availability could not be sent to the core", failure)
        }
    }
}
