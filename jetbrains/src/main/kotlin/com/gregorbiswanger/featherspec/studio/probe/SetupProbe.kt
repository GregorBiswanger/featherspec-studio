package com.gregorbiswanger.featherspec.studio.probe

import com.gregorbiswanger.featherspec.studio.runtime.CoreRuntime
import com.google.gson.JsonObject
import java.nio.file.Files
import java.nio.file.Path
import java.util.concurrent.TimeUnit

class SetupProbe(
    private val runtime: CoreRuntime,
    private val projectDir: Path,
    private val out: Path,
    private val routes: FakeReleaseRoutes?,
) {
    fun run() {
        val outcome = JsonObject()
        try {
            runtime.invoke("setup", "{}").get(CALL_MINUTES, TimeUnit.MINUTES)
            outcome.addProperty("ok", true)
        } catch (failure: Throwable) {
            outcome.addProperty("ok", false)
            outcome.addProperty("error", failure.toString())
        }
        Files.writeString(out.resolve(REQUESTS_FILE), routes?.toJson() ?: EMPTY_REQUESTS)
        Files.writeString(out.resolve(FILES_FILE), SetupFiles.collect(projectDir))
        Files.writeString(out.resolve(DONE_FILE), outcome.toString())
    }

    companion object {
        const val FILES_FILE = "setup-files.json"
        const val REQUESTS_FILE = "setup-requests.json"
        const val DONE_FILE = "setup-done.json"
        private const val EMPTY_REQUESTS = "{\"served\":[],\"refused\":[]}"
        private const val CALL_MINUTES = 5L
    }
}
