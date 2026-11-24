package com.gregorbiswanger.featherspec.studio.ports

import com.gregorbiswanger.featherspec.studio.StudioProjectService
import com.gregorbiswanger.featherspec.studio.assistant.CliOnPath
import com.gregorbiswanger.featherspec.studio.settings.PluginOptionsBus
import com.intellij.ide.plugins.DynamicPluginListener
import com.intellij.ide.plugins.IdeaPluginDescriptor
import com.intellij.ide.plugins.PluginManagerCore
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.diagnostic.thisLogger
import com.intellij.openapi.extensions.PluginId
import com.intellij.openapi.progress.ProcessCanceledException
import com.intellij.openapi.project.ProjectManager
import java.io.File
import java.lang.reflect.InvocationTargetException
import java.lang.reflect.Modifier

class IdePlugins : PluginQuery {
    override fun available(id: String): Boolean = try {
        val pluginId = PluginId.getId(id)
        PluginActivity.available(PluginManagerCore.isPluginInstalled(pluginId), PluginActivity.CURRENT, { loaded(pluginId) }, { disabled(pluginId) })
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

    private fun disabled(pluginId: PluginId): Boolean {
        try {
            val type = Class.forName(PLUGIN_MANAGER_CORE)
            val method = type.methods.first { it.name == IS_DISABLED && it.parameterCount == 1 }
            val receiver = if (Modifier.isStatic(method.modifiers)) null else type.getField("INSTANCE").get(null)
            return method.invoke(receiver, pluginId) as Boolean
        } catch (failure: InvocationTargetException) {
            throw failure.targetException
        } catch (failure: ReflectiveOperationException) {
            throw IllegalStateException("$PLUGIN_MANAGER_CORE.$IS_DISABLED could not be asked", failure)
        }
    }

    fun snapshot(absent: Set<String> = emptySet()): List<String> {
        val plugins = PluginAvailability.snapshot(this, absent)
        if (PluginIds.TERMINAL !in plugins) {
            return plugins
        }
        val found = CliAvailability.finder({ CliAvailability.pathOf(::idePath) { System.getenv("PATH") } }, File.pathSeparatorChar, CliOnPath::existsOnDisk)
        return CliAvailability.snapshot(plugins, found)
    }

    private fun idePath(): String? {
        val type = Class.forName(ENVIRONMENT_UTIL)
        val method = type.methods.first { it.name == GET_VALUE && it.parameterCount == 1 }
        val receiver = if (Modifier.isStatic(method.modifiers)) null else type.getField("INSTANCE").get(null)
        try {
            return method.invoke(receiver, "PATH") as? String
        } catch (failure: InvocationTargetException) {
            throw failure.targetException
        }
    }
}

private const val ENVIRONMENT_UTIL = "com.intellij.util.EnvironmentUtil"
private const val GET_VALUE = "getValue"

private const val PLUGIN_MANAGER_CORE = "com.intellij.ide.plugins.PluginManagerCore"
private const val IS_DISABLED = "isDisabled"

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
