package com.gregorbiswanger.featherspec.studio.assistant

import com.gregorbiswanger.featherspec.studio.ports.HostOs
import com.gregorbiswanger.featherspec.studio.ports.IdePlugins
import com.gregorbiswanger.featherspec.studio.ports.PluginIds
import com.gregorbiswanger.featherspec.studio.ports.UiMemoryState
import com.intellij.openapi.diagnostic.thisLogger
import com.intellij.openapi.project.Project

class IdeAssistantCalls(private val project: Project) : AssistantCalls {
    private val lastTyped = LastTyped()

    override fun claudeTerminal(request: ClaudeRequest) {
        if (!IdePlugins().available(PluginIds.TERMINAL)) {
            throw IllegalStateException(TERMINAL_UNAVAILABLE)
        }
        try {
            sender().send(request)
        } catch (failure: LinkageError) {
            throw IllegalStateException("the Terminal API could not be used (${failure.javaClass.simpleName})", failure)
        }
    }

    override fun openChat(assistant: ChatAssistant): Boolean = try {
        val candidates = ChatWindows.candidates(assistant, IdePlugins().available(PluginIds.AI_ASSISTANT))
        IdeChatWindows(project).open(candidates)
    } catch (failure: RuntimeException) {
        thisLogger().warn("The ${assistant.id} chat window could not be opened", failure)
        false
    }

    private fun sender(): ClaudeSender = ClaudeSender(
        access = TerminalGlue(project),
        root = { root() },
        caseInsensitive = HostOs.caseInsensitive,
        lastTyped = lastTyped,
        clock = { System.nanoTime() / NANOS_PER_MILLI },
        sleep = { Thread.sleep(it) },
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
