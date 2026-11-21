package com.gregorbiswanger.featherspec.studio.ports

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class ProjectFoldersTest {
    @Test
    fun baseDirectoryComesFirstOnWindows() {
        val folders = ProjectFolders.folders("C:/projects/test", listOf("D:/other/lib"), true)
        assertEquals(
            listOf(
                Folder("file:///c%3A/projects/test", "test", "C:\\projects\\test"),
                Folder("file:///d%3A/other/lib", "lib", "D:\\other\\lib"),
            ),
            folders,
        )
    }

    @Test
    fun posixFoldersUseThePathAsDisplayPath() {
        val folders = ProjectFolders.folders("/home/u/a b", emptyList(), false)
        assertEquals(listOf(Folder("file:///home/u/a%20b", "a b", "/home/u/a b")), folders)
    }

    @Test
    fun contentRootInsideTheBaseIsDropped() {
        val folders = ProjectFolders.folders("/work/app", listOf("/work/app/module", "/work/app", "/work/lib"), false)
        assertEquals(listOf("/work/app", "/work/lib"), folders.map { it.displayPath })
    }

    @Test
    fun siblingWithSamePrefixIsKept() {
        val folders = ProjectFolders.folders("/work/app", listOf("/work/app2"), false)
        assertEquals(listOf("/work/app", "/work/app2"), folders.map { it.displayPath })
    }

    @Test
    fun duplicateContentRootsAppearOnce() {
        val folders = ProjectFolders.folders("/work/app", listOf("/work/lib", "/work/lib/"), false)
        assertEquals(listOf("/work/app", "/work/lib"), folders.map { it.displayPath })
    }

    @Test
    fun windowsComparisonIgnoresCase() {
        val folders = ProjectFolders.folders("C:/Projects/Test", listOf("c:/projects/test/sub"), true)
        assertEquals(1, folders.size)
    }

    @Test
    fun posixComparisonRespectsCase() {
        val folders = ProjectFolders.folders("/work/App", listOf("/work/app/sub"), false)
        assertEquals(2, folders.size)
    }

    @Test
    fun withoutBasePathTheContentRootsRemain() {
        val folders = ProjectFolders.folders(null, listOf("/a/b", "/c/d"), false)
        assertEquals(listOf("b", "d"), folders.map { it.name })
    }

    @Test
    fun nothingGivesNoFolders() {
        assertEquals(emptyList<Folder>(), ProjectFolders.folders(null, emptyList(), false))
    }

    @Test
    fun trailingSeparatorsAreIgnored() {
        val folders = ProjectFolders.folders("C:/projects/test/", emptyList(), true)
        assertEquals("file:///c%3A/projects/test", folders.single().root)
    }

    @Test
    fun jsonCarriesTheThreeFields() {
        val json = Folder("file:///x", "x", "/x").toJson()
        assertEquals("""{"root":"file:///x","name":"x","displayPath":"/x"}""", json.toString())
    }
}
