package com.gregorbiswanger.featherspec.studio.assistant

import com.gregorbiswanger.featherspec.studio.StudioProjectService
import com.gregorbiswanger.featherspec.studio.ports.HostOs
import com.gregorbiswanger.featherspec.studio.ports.IdeManagedJunie
import com.gregorbiswanger.featherspec.studio.ports.IdePlugins
import com.gregorbiswanger.featherspec.studio.ports.PluginIds
import com.gregorbiswanger.featherspec.studio.ports.UiMemoryState
import com.intellij.ide.trustedProjects.TrustedProjects
import com.intellij.openapi.application.PathManager
import com.intellij.openapi.project.Project
import java.io.File

class IdeAssistantCalls(private val project: Project) : AssistantCalls {
    private val lastTyped = LastTyped()
    private val gate = SendGate()

    override fun terminal(request: AgentRequest) {
        if (!IdePlugins().available(PluginIds.TERMINAL)) {
            throw IllegalStateException(TERMINAL_UNAVAILABLE)
        }
        try {
            sender().send(request)
        } catch (failure: AgentNotInstalled) {
            project.getService(StudioProjectService::class.java).refreshAvailability()
            throw failure
        } catch (failure: LinkageError) {
            throw IllegalStateException("the Terminal API could not be used (${failure.javaClass.simpleName})", failure)
        }
    }

    private fun onPath(agent: CliAgent): Boolean =
        CliOnPath.found(agent.pathNames, System.getenv("PATH"), File.pathSeparatorChar, CliOnPath::existsOnDisk)

    private fun managed(agent: CliAgent): String? = try {
        IdeManagedJunie.managedPath(agent) { IdeManagedJunie.findOnDisk(PathManager.getSystemPath(), HostOs.windows) }
    } catch (failure: RuntimeException) {
        null
    }

    // PATH keeps the plain command; the IDE-managed Junie is started by its full path (PD-112 amendment 2026-11-26).
    private fun launch(agent: CliAgent): String = IdeManagedJunie.launch(agent, onPath(agent), managed(agent))

    private fun sender(): AgentSender = AgentSender(
        access = TerminalGlue(project, ::launch),
        root = { root() },
        caseInsensitive = HostOs.caseInsensitive,
        lastTyped = lastTyped,
        clock = { System.nanoTime() / NANOS_PER_MILLI },
        sleep = { Thread.sleep(it) },
        gate = gate,
        onPath = { agent -> onPath(agent) || managed(agent) != null },
        trusted = { TrustedProjects.isProjectTrusted(project) },
    )

    private fun root(): String? {
        val base = project.basePath.orEmpty()
        return ActiveRoot.of(UiMemoryState.getInstance().memory.forProject(base)[ActiveRoot.MEMORY_KEY], project.basePath)
    }

    private companion object {
        const val TERMINAL_UNAVAILABLE = "the Terminal plugin is not available"
        const val NANOS_PER_MILLI = 1_000_000L
    }
}
