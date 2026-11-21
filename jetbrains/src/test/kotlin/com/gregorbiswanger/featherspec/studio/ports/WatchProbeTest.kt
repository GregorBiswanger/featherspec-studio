package com.gregorbiswanger.featherspec.studio.ports

import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.nio.file.FileSystems
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.StandardWatchEventKinds.ENTRY_CREATE
import java.nio.file.StandardWatchEventKinds.ENTRY_MODIFY
import java.util.concurrent.TimeUnit

class WatchProbeTest {
    @Test
    fun probe(@TempDir root: Path) {
        val service = FileSystems.getDefault().newWatchService()
        val registered = root.register(service, ENTRY_CREATE, ENTRY_MODIFY)
        Files.writeString(root.resolve("a.md"), "a")
        val polled = service.poll(10, TimeUnit.SECONDS)
        println("WATCHPROBE service=${service.javaClass.name} registered=${registered.javaClass.name} polled=${polled?.javaClass?.name} same=${polled === registered} equal=${polled == registered} watchable=${polled?.watchable()?.javaClass?.name} ${polled?.watchable()} root=$root events=${polled?.pollEvents()?.map { "${it.kind()}:${it.context()}:${it.context()?.javaClass?.name}" }}")
        service.close()
    }
}
