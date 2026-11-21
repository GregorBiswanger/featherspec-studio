package com.gregorbiswanger.featherspec.studio.ports

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.nio.file.Path

class StoreLocationTest {
    private val system = Path.of("system")

    private fun projectsDir(): Path = system.resolve("featherspec-studio").resolve("projects")

    @Test
    fun hashesTheRootUriOnPosix() {
        assertEquals(
            projectsDir().resolve("254b4dd2dd661f73"),
            StoreLocation.storeDir(system, "file:///home/dev/Project", false),
        )
    }

    @Test
    fun keepsCaseOnPosix() {
        assertNotEquals(
            StoreLocation.storeDir(system, "file:///home/dev/Project", false),
            StoreLocation.storeDir(system, "file:///home/dev/project", false),
        )
    }

    @Test
    fun lowercasesTheRootOnWindows() {
        val mixed = StoreLocation.storeDir(system, "file:///c:/Users/Dev/Project", true)
        assertEquals(projectsDir().resolve("50aafce4841b722a"), mixed)
        assertEquals(mixed, StoreLocation.storeDir(system, "file:///c:/users/dev/project", true))
    }

    @Test
    fun doesNotLowercaseWhenNotWindows() {
        assertEquals(
            projectsDir().resolve("6bc9943d7495f534"),
            StoreLocation.storeDir(system, "file:///c:/Users/Dev/Project", false),
        )
    }

    @Test
    fun usesSixteenLowercaseHexCharacters() {
        val name = StoreLocation.storeDir(system, "file:///x", false).fileName.toString()
        assertTrue(Regex("^[0-9a-f]{16}$").matches(name))
    }
}
