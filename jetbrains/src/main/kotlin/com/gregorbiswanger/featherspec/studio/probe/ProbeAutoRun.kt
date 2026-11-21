package com.gregorbiswanger.featherspec.studio.probe

import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.project.Project
import com.intellij.openapi.startup.ProjectActivity
import java.nio.file.Path

class ProbeAutoRun : ProjectActivity {
    override suspend fun execute(project: Project) {
        val out = System.getProperty(ProbeProperties.OUT) ?: return
        ApplicationManager.getApplication().executeOnPooledThread(Runnable { ProbeRun(project, Path.of(out)).run() })
    }
}
