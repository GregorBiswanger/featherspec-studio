package com.gregorbiswanger.featherspec.spike

import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.project.Project
import com.intellij.openapi.startup.ProjectActivity

class SpikeAutoRun : ProjectActivity {
    override suspend fun execute(project: Project) {
        if (System.getProperty("spike.out") == null) return
        ApplicationManager.getApplication().executeOnPooledThread {
            Thread.sleep(5000)
            if (System.getProperty("spike.vfs") == "true") runSpikeVfs(project)
            if (System.getProperty("spike.v2") == "true") runSpikeV2(project)
            if (System.getProperty("spike.probe") != "false") runSpikeProbe(project)
        }
    }
}
