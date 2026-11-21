package com.gregorbiswanger.featherspec.studio.probe

import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.project.Project
import com.intellij.openapi.startup.ProjectActivity
import java.nio.file.Path

class ProbeAutoRun : ProjectActivity {
    override suspend fun execute(project: Project) {
        val out = Path.of(System.getProperty(ProbeProperties.OUT) ?: return)
        val noJcef = System.getProperty(ProbeProperties.PROBE) == NoJcefProbe.PROBE_NAME
        ApplicationManager.getApplication().executeOnPooledThread(
            Runnable { if (noJcef) NoJcefProbe(project, out).run() else ProbeRun(project, out).run() },
        )
    }
}
