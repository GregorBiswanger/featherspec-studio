package com.gregorbiswanger.featherspec.studio.probe

import com.google.gson.JsonParser
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.nio.file.Files
import java.nio.file.Path
import java.util.Base64

class SetupFilesTest {
    @TempDir
    lateinit var temp: Path

    private fun write(relative: String, bytes: ByteArray) {
        val target = temp.resolve(relative)
        Files.createDirectories(target.parent)
        Files.write(target, bytes)
    }

    private fun b64(text: String): String = Base64.getEncoder().encodeToString(text.toByteArray(Charsets.UTF_8))

    private fun expected(vararg files: Pair<String, String>): String {
        val entries = files.joinToString(",") { (path, text) -> "{\"path\":\"$path\",\"text\":\"$text\"}" }
        return "{\"classes\":[],\"mergePrompt\":\"m\",\"writes\":{\"files\":[$entries],\"outcome\":{}}}"
    }

    private fun actual(vararg files: Pair<String, String>): String {
        val entries = files.joinToString(",") { (path, text) -> "{\"path\":\"$path\",\"base64\":\"${b64(text)}\"}" }
        return "{\"files\":[$entries]}"
    }

    @Test
    fun `collect lists every file but the top idea folder, sorted, with relative slash paths and base64 bytes`() {
        write(".idea/workspace.xml", byteArrayOf(1))
        write("b.txt", "b".toByteArray())
        write(".claude/commands/x.md", "ä\n".toByteArray(Charsets.UTF_8))
        write("a/.idea/keep.txt", "k".toByteArray())
        write("a.txt", byteArrayOf(0, -1, 10))
        Files.createDirectories(temp.resolve("empty"))
        val files = JsonParser.parseString(SetupFiles.collect(temp)).asJsonObject.getAsJsonArray("files")
        assertEquals(
            listOf(".claude/commands/x.md", "a.txt", "a/.idea/keep.txt", "b.txt"),
            files.map { it.asJsonObject.get("path").asString },
        )
        assertEquals(b64("ä\n"), files[0].asJsonObject.get("base64").asString)
        assertEquals(Base64.getEncoder().encodeToString(byteArrayOf(0, -1, 10)), files[1].asJsonObject.get("base64").asString)
    }

    @Test
    fun `collect of an empty directory has no files`() {
        assertEquals("{\"files\":[]}", SetupFiles.collect(temp))
    }

    @Test
    fun `AC-005 equal paths and bytes give no difference`() {
        assertEquals(
            emptyList<String>(),
            SetupCompare.differences(expected("a.md" to "x\\n", "b/c.md" to "ä"), actual("a.md" to "x\n", "b/c.md" to "ä")),
        )
    }

    @Test
    fun `a missing, an extra and a changed file are each a difference`() {
        val found = SetupCompare.differences(
            expected("a.md" to "one", "b.md" to "two", "c.md" to "three"),
            actual("a.md" to "one", "c.md" to "thrEe", "d.md" to "four"),
        )
        assertEquals(listOf("missing file: b.md", "unexpected file: d.md"), found.take(2))
        assertEquals(3, found.size)
        assertTrue(found[2].startsWith("bytes differ: c.md at byte 3 "), found[2])
    }

    @Test
    fun `a longer file is a difference at the end of the shorter`() {
        val found = SetupCompare.differences(expected("a.md" to "ab"), actual("a.md" to "abc"))
        assertEquals(listOf("bytes differ: a.md at byte 2 (expected 2 bytes, actual 3)"), found)
    }

    @Test
    fun `requests are right only when all three routes were served in order and none refused`() {
        val ok = "{\"served\":[\"${FakeReleaseRoutes.LATEST}\",\"${FakeReleaseRoutes.ARCHIVE}\",\"${FakeReleaseRoutes.CODELOAD}\"],\"refused\":[]}"
        assertEquals(emptyList<String>(), SetupCompare.requests(ok))
        assertEquals(1, SetupCompare.requests("{\"served\":[],\"refused\":[]}").size)
        assertEquals(1, SetupCompare.requests("{\"served\":[\"${FakeReleaseRoutes.LATEST}\"],\"refused\":[]}").size)
        val refused = "{\"served\":[\"${FakeReleaseRoutes.LATEST}\",\"${FakeReleaseRoutes.ARCHIVE}\",\"${FakeReleaseRoutes.CODELOAD}\"],\"refused\":[\"https://x.test/\"]}"
        assertEquals(listOf("requests without a canned answer: [https://x.test/]"), SetupCompare.requests(refused))
    }
}
