package com.gregorbiswanger.featherspec.studio.ports

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.nio.file.Path

class FileUrisTest {
    @Test
    fun windowsDrivePathWithBackslashes() {
        assertEquals("file:///c%3A/projects/test", FileUris.fromText("C:\\projects\\test", true))
    }

    @Test
    fun windowsDrivePathWithForwardSlashes() {
        assertEquals("file:///c%3A/projects/test", FileUris.fromText("C:/projects/test", true))
    }

    @Test
    fun windowsDriveRoot() {
        assertEquals("file:///c%3A/", FileUris.fromText("C:\\", true))
    }

    @Test
    fun windowsDriveLetterIsLowercasedOnly() {
        assertEquals("file:///d%3A/Work/X", FileUris.fromText("D:\\Work\\X", true))
    }

    @Test
    fun windowsUncPath() {
        assertEquals("file://server/share/dir", FileUris.fromText("\\\\server\\share\\dir", true))
    }

    @Test
    fun posixPathWithSpace() {
        assertEquals("file:///home/u/a%20b", FileUris.fromText("/home/u/a b", false))
    }

    @Test
    fun nonAsciiIsPercentEncodedAsUtf8() {
        assertEquals("file:///home/u/%C3%BC%20%C3%B1", FileUris.fromText("/home/u/ü ñ", false))
    }

    @Test
    fun supplementaryCharacterIsEncodedAsOneSequence() {
        assertEquals("file:///tmp/%F0%9F%98%80", FileUris.fromText("/tmp/\uD83D\uDE00", false))
    }

    @Test
    fun reservedCharactersAreEncoded() {
        assertEquals(
            "file:///tmp/a%2Bb%28c%29%40d%23e%25f%26g%3Dh",
            FileUris.fromText("/tmp/a+b(c)@d#e%f&g=h", false),
        )
    }

    @Test
    fun unreservedCharactersStay() {
        assertEquals("file:///tmp/a-b.c_d~e", FileUris.fromText("/tmp/a-b.c_d~e", false))
    }

    @Test
    fun uriToPathTextForWindowsDrive() {
        assertEquals("c:/projects/test", FileUris.toPathText("file:///c%3A/projects/test"))
    }

    @Test
    fun uriToPathTextForPosix() {
        assertEquals("/home/u/a b", FileUris.toPathText("file:///home/u/a%20b"))
    }

    @Test
    fun uriToPathTextDecodesUtf8() {
        assertEquals("/home/u/ü ñ \uD83D\uDE00", FileUris.toPathText("file:///home/u/%C3%BC%20%C3%B1%20%F0%9F%98%80"))
    }

    @Test
    fun uriToPathTextForUnc() {
        assertEquals("//server/share/dir", FileUris.toPathText("file://server/share/dir"))
    }

    @Test
    fun uriToPathTextTreatsLocalhostAsEmptyAuthority() {
        assertEquals("/home/u", FileUris.toPathText("file://localhost/home/u"))
    }

    @Test
    fun malformedEscapeStaysLiteral() {
        assertEquals("/tmp/100%zz", FileUris.toPathText("file:///tmp/100%zz"))
    }

    @Test
    fun otherSchemesAreRejected() {
        assertThrows(IllegalArgumentException::class.java) { FileUris.toPathText("http://host/x") }
    }

    @Test
    fun windowsRoundTrip() {
        val uri = "file:///c%3A/projects/my%20test"
        assertEquals(uri, FileUris.fromText(FileUris.toPathText(uri), true))
    }

    @Test
    fun posixRoundTrip() {
        val uri = "file:///home/u/%C3%BC%20x"
        assertEquals(uri, FileUris.fromText(FileUris.toPathText(uri), false))
    }

    @Test
    fun realPathRoundTrip(@TempDir directory: Path) {
        val uri = FileUris.toUri(directory, HostOs.windows)
        assertEquals(directory, FileUris.toPath(uri))
    }
}
