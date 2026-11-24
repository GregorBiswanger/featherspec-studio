package com.gregorbiswanger.featherspec.studio

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class HostLogTest {
    private fun host(coreLog: (String) -> Unit = {}) = HostRouter(
        CallRouter({ _, _ -> null }, { _, _ -> null }, { _, _ -> null }, { _, _ -> null }),
        { _, _ -> },
        { it() },
        coreLog,
    )

    @Test
    fun `lines that arrive before the log view exists are replayed to it`() {
        val host = host()
        host.emit("log", """["early one","early two"]""")
        host.note("FeatherSpec core failed: boom")
        val replayed = ArrayList<String>()
        val live = ArrayList<String>()
        host.attachLog({ replayed.addAll(it) }, { live.addAll(it) })
        host.emit("log", """["late"]""")
        assertEquals(listOf("early one", "early two", "FeatherSpec core failed: boom"), replayed)
        assertEquals(listOf("late"), live)
    }

    @Test
    fun `a detached log view receives nothing more`() {
        val host = host()
        val live = ArrayList<String>()
        val detach = host.attachLog({ }, { live.addAll(it) })
        host.emit("log", """["one"]""")
        detach()
        host.emit("log", """["two"]""")
        assertEquals(listOf("one"), live)
    }

    @Test
    fun `core log events also go to the platform log but host notes do not`() {
        val seen = ArrayList<String>()
        val host = host { seen.add(it) }
        host.emit("log", """["a","b"]""")
        host.note("FeatherSpec core failed: boom")
        host.emit("tree", "{}")
        assertEquals(listOf("a", "b"), seen)
        assertEquals(listOf("a", "b", "FeatherSpec core failed: boom"), host.log.value)
    }

    @Test
    fun `a note stays one line with quotes and newlines intact`() {
        val host = host()
        host.note("reason \"x\"\\y")
        assertEquals(listOf("reason \"x\"\\y"), host.log.value)
    }

    @Test
    fun `a port that fails with a linkage error still answers its call`() {
        val resolved = ArrayList<Pair<String, String>>()
        val router = CallRouter(
            files = { _, _ -> throw NoSuchMethodError("PluginManagerCore.gone") },
            medium = { _, _ -> null },
            memory = { _, _ -> null },
            watch = { _, _ -> null },
        )
        val host = HostRouter(router, { id, json -> resolved.add(id to json) }, { it() })
        host.call("c-1", "fs.stat", "{}")
        assertEquals(listOf("c-1" to """{"error":"PluginManagerCore.gone"}"""), resolved)
    }
}
