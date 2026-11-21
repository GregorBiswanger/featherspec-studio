package com.gregorbiswanger.featherspec.studio

import com.intellij.openapi.project.Project
import com.intellij.openapi.startup.ProjectActivity

class StudioStartup : ProjectActivity {
    override suspend fun execute(project: Project) {
        val service = project.getService(StudioProjectService::class.java)
        service.startedAtNanos = System.nanoTime()
        service.start()
    }
}
