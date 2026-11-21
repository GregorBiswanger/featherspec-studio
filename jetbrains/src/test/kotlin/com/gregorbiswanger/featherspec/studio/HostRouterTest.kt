package com.gregorbiswanger.featherspec.studio

import com.google.gson.JsonParser
import com.gregorbiswanger.featherspec.studio.ports.FilePorts
import com.gregorbiswanger.featherspec.studio.ports.FileUris
import com.gregorbiswanger.featherspec.studio.ports.HostOs
import com.gregorbiswanger.featherspec.studio.ports.MediumPorts
import com.gregorbiswanger.featherspec.studio.ports.UiMemory
import com.gregorbiswanger.featherspec.studio.runtime.ASYNC_CALLS
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.nio.file.Files
import java.nio.file.Path

class HostRouterTest {
    private val seen = ArrayList<Pair<String, String>>()

    private fun fakePort(label: String): CallPort = { name, args ->
        seen.add(name to args)
        """{"ok":"$label"}"""
    }

    private fun fakeRouter() = CallRouter(
        files = fakePort("files"),
        medium = fakePort("medium"),
        memory = fakePort("memory"),
        watch = fakePort("watch"),
        panel = fakePort("panel"),
    )

    private fun parsed(reply: String) = JsonParser.parseString(reply).asJsonObject

    @Test
    fun `every async call is routed or deferred and never both`() {
        val routed = ASYNC_CALLS.filter { it in CallRouter.ROUTED }
        val deferred = ASYNC_CALLS.filter { name -> name !in CallRouter.ROUTED && CallRouter.DEFERRED_PREFIXES.any { name.startsWith(it) } }
        assertTrue(CallRouter.ROUTED.keys.all { it in ASYNC_CALLS })
        assertEquals(emptyList<String>(), routed.filter { it in deferred })
        assertEquals(ASYNC_CALLS.toSet(), (routed + deferred).toSet())
    }

    @Test
    fun `every routed name reaches its own port with the arguments untouched`() {
        val router = fakeRouter()
        for ((name, group) in CallRouter.ROUTED) {
            seen.clear()
            val reply = parsed(router.answer(name, """{"x":1}"""))
            assertEquals(group.name.lowercase(), reply.get("ok").asString, name)
            assertEquals(listOf(name to """{"x":1}"""), seen, name)
        }
    }

    @Test
    fun `every deferred name answers not yet and reaches no port`() {
        val router = fakeRouter()
        for (name in ASYNC_CALLS.filter { it !in CallRouter.ROUTED }) {
            assertEquals("""{"error":"not yet"}""", router.answer(name, "{}"), name)
        }
        assertEquals(emptyList<Pair<String, String>>(), seen)
    }

    @Test
    fun `the panel calls reach the panel port and the other actions stay deferred`() {
        val router = fakeRouter()
        assertEquals(setOf("actions.openStudio", "actions.reloadPanel"), CallRouter.ROUTED.filterValues { it == CallRouter.Group.PANEL }.keys)
        assertEquals("panel", parsed(router.answer("actions.openStudio", "{}")).get("ok").asString)
        assertEquals("panel", parsed(router.answer("actions.reloadPanel", "{}")).get("ok").asString)
        assertEquals("""{"error":"not yet"}""", router.answer("actions.manageTrust", "{}"))
        assertEquals("""{"error":"not yet"}""", router.answer("actions.openSetupGuide", "{}"))
    }

    @Test
    fun `a router without a panel port answers an error for the panel calls`() {
        val router = CallRouter(fakePort("files"), fakePort("medium"), fakePort("memory"), fakePort("watch"))
        assertEquals("no answer for actions.openStudio", parsed(router.answer("actions.openStudio", "{}")).get("error").asString)
    }

    @Test
    fun `an unknown name answers an error that names it`() {
        val router = fakeRouter()
        assertEquals("unknown nope.x", parsed(router.answer("nope.x", "{}")).get("error").asString)
        assertEquals("unknown ui.bogus", parsed(router.answer("ui.bogus", "{}")).get("error").asString)
        assertEquals(emptyList<Pair<String, String>>(), seen)
    }

    @Test
    fun `a port that has no answer or throws becomes an error reply`() {
        val router = CallRouter(
            files = { _, _ -> null },
            medium = { _, _ -> throw IllegalStateException("boom") },
            memory = fakePort("memory"),
            watch = fakePort("watch"),
        )
        assertEquals("no answer for fs.stat", parsed(router.answer("fs.stat", "{}")).get("error").asString)
        assertEquals("boom", parsed(router.answer("medium.read", "{}")).get("error").asString)
    }

    @Test
    fun `source list is answered from the real file ports through the host router`(@TempDir temp: Path) {
        Files.createDirectories(temp.resolve(".specs/backlog"))
        Files.writeString(temp.resolve(".specs/backlog/a.md"), "# A\n")
        val root = FileUris.toUri(temp, HostOs.windows)
        val resolved = ArrayList<Pair<String, String>>()
        val host = HostRouter(
            router = CallRouter(FilePorts()::answer, fakePort("medium"), fakePort("memory"), fakePort("watch")),
            resolve = { id, json -> resolved.add(id to json) },
            execute = { it() },
        )
        val args = JsonParser.parseString("""{"root":"$root","relativePath":".specs/backlog"}""").toString()
        host.call("c-1", "source.list", args)
        assertEquals(1, resolved.size)
        assertEquals("c-1", resolved[0].first)
        val names = parsed(resolved[0].second).getAsJsonArray("ok").map { it.asJsonObject.get("name").asString }
        assertEquals(listOf("a.md"), names)
    }

    @Test
    fun `source scan is answered from the real file ports through the host router`(@TempDir temp: Path) {
        Files.createDirectories(temp.resolve(".specs/backlog"))
        Files.writeString(temp.resolve(".specs/backlog/a.md"), "# A\n")
        val root = FileUris.toUri(temp, HostOs.windows)
        val resolved = ArrayList<Pair<String, String>>()
        val host = HostRouter(
            router = CallRouter(FilePorts()::answer, fakePort("medium"), fakePort("memory"), fakePort("watch")),
            resolve = { id, json -> resolved.add(id to json) },
            execute = { it() },
        )
        val args = JsonParser.parseString("""{"root":"$root","dirs":[".specs",".memory-bank"]}""").toString()
        host.call("c-2", "source.scan", args)
        assertEquals(1, resolved.size)
        assertEquals("c-2", resolved[0].first)
        val entries = parsed(resolved[0].second).getAsJsonObject("ok").getAsJsonObject("entries")
        assertEquals(setOf(".specs", ".specs/backlog", ".specs/backlog/a.md"), entries.keySet())
        assertEquals(CallRouter.Group.FILES, CallRouter.ROUTED["source.scan"])
    }

    @Test
    fun `memory set writes the state and null removes it`() {
        val memory = UiMemory(HashMap())
        val router = CallRouter(
            files = fakePort("files"),
            medium = fakePort("medium"),
            memory = { name, args -> memory.answer(name, args, "/proj") },
            watch = fakePort("watch"),
        )
        assertEquals("""{"ok":null}""", router.answer("memory.set", """{"key":"k","value":"{\"a\":1}"}"""))
        assertEquals(mapOf("k" to """{"a":1}"""), memory.forProject("/proj"))
        assertEquals("""{"ok":null}""", router.answer("memory.set", """{"key":"k","value":null}"""))
        assertEquals(emptyMap<String, String>(), memory.forProject("/proj"))
    }

    @Test
    fun `medium calls reach a store outside the project`(@TempDir temp: Path) {
        val medium = MediumPorts.under(temp, false)
        val router = CallRouter(fakePort("files"), medium::answer, fakePort("memory"), fakePort("watch"))
        val root = "file:///proj"
        assertEquals("""{"ok":null}""", router.answer("medium.append", """{"root":"$root","name":"h/x.log","text":"a\n"}"""))
        assertEquals("""{"ok":"a\n"}""", router.answer("medium.read", """{"root":"$root","name":"h/x.log"}"""))
        assertTrue(Files.walk(temp).use { stream -> stream.anyMatch { it.fileName.toString() == "x.log" } })
    }

    @Test
    fun `an unknown name resolves the id with an error through the host router`() {
        val resolved = ArrayList<Pair<String, String>>()
        val host = HostRouter(fakeRouter(), { id, json -> resolved.add(id to json) }, { it() })
        host.call("c-9", "nope", "{}")
        assertEquals(listOf("c-9" to """{"error":"unknown nope"}"""), resolved)
    }

    @Test
    fun `tree status and log emits are held and announced`() {
        val host = HostRouter(fakeRouter(), { _, _ -> }, { it() })
        val trees = ArrayList<String?>()
        val remove = host.tree.onChange { trees.add(it) }
        assertNull(host.tree.value)
        host.emit("tree", """{"rows":[]}""")
        host.emit("status", "null")
        host.emit("log", """["one","two"]""")
        host.emit("log", """["three"]""")
        assertEquals("""{"rows":[]}""", host.tree.value)
        assertEquals("null", host.status.value)
        assertEquals(listOf("one", "two", "three"), host.log.value)
        assertEquals(listOf<String?>("""{"rows":[]}"""), trees)
        remove()
        host.emit("tree", "{}")
        assertEquals(1, trees.size)
    }

    @Test
    fun `other channels reach only their subscribers and a subscription can be removed`() {
        val host = HostRouter(fakeRouter(), { _, _ -> }, { it() })
        val warnings = ArrayList<String>()
        val remove = host.subscribe("warn") { warnings.add(it) }
        host.emit("warn", "\"careful\"")
        host.emit("panel", "{}")
        remove()
        host.emit("warn", "\"again\"")
        assertEquals(listOf("\"careful\""), warnings)
        assertFalse(host.log.value.isNotEmpty())
    }

    @Test
    fun `the log keeps only the newest lines`() {
        val host = HostRouter(fakeRouter(), { _, _ -> }, { it() })
        repeat(6) { block ->
            val lines = (0 until 1_000).joinToString(",", "[", "]") { "\"b$block-$it\"" }
            host.emit("log", lines)
        }
        assertEquals(5_000, host.log.value.size)
        assertEquals("b5-999", host.log.value.last())
        assertEquals("b1-0", host.log.value.first())
    }
}
