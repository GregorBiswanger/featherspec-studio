package com.gregorbiswanger.featherspec.studio.probe

import com.gregorbiswanger.featherspec.studio.StudioProjectService
import com.gregorbiswanger.featherspec.studio.runtime.CoreState
import com.gregorbiswanger.featherspec.studio.runtime.CoreStateHolder
import com.intellij.openapi.project.Project
import java.nio.file.Files
import java.nio.file.Path
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

object ProbeProperties {
    const val OUT = "featherspec.probe.out"
    const val PROBE = "featherspec.probe"
    const val CONFORMANCE = "featherspec.conformance"
}

class ProbeRun(private val project: Project, private val out: Path) {
    fun run() {
        try {
            Files.createDirectories(out)
            val service = project.getService(StudioProjectService::class.java)
            val problem = awaitReady(service.state)
            if (problem != null) {
                fail(problem)
                return
            }
            val runtime = service.runtime
            if (runtime == null) {
                fail("the project service has no runtime")
                return
            }
            when (val probe = System.getProperty(ProbeProperties.PROBE).orEmpty()) {
                "conformance" -> conformance(service)
                else -> fail("unknown probe '$probe'")
            }
        } catch (failure: Throwable) {
            fail(failure.toString())
        }
    }

    private fun conformance(service: StudioProjectService) {
        val directory = System.getProperty(ProbeProperties.CONFORMANCE)
        val runtime = service.runtime
        if (directory == null || runtime == null) {
            fail("featherspec.conformance is not set")
            return
        }
        ConformanceProbe(runtime, Path.of(directory).resolve("inputs"), out, WarmStart::measureMs).run()
    }

    private fun awaitReady(state: CoreStateHolder): String? {
        val settled = CountDownLatch(1)
        val remove = state.onChange { next ->
            if (next != CoreState.Loading) {
                settled.countDown()
            }
        }
        try {
            if (state.value != CoreState.Loading) {
                settled.countDown()
            }
            if (!settled.await(READY_WAIT_MINUTES, TimeUnit.MINUTES)) {
                return "the core was not ready within $READY_WAIT_MINUTES minutes"
            }
            return if (state.value == CoreState.Ready) null else "the core state is ${state.value}"
        } finally {
            remove()
        }
    }

    private fun fail(reason: String) {
        Files.writeString(out.resolve("probe-error.txt"), reason)
    }

    private companion object {
        const val READY_WAIT_MINUTES = 5L
    }
}
