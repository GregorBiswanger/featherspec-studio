package com.gregorbiswanger.featherspec.studio.panel

import com.intellij.openapi.fileTypes.FileTypes
import com.intellij.openapi.util.Key
import com.intellij.openapi.vfs.VirtualFile
import com.intellij.testFramework.LightVirtualFile

object StudioFile {
    const val NAME = "FeatherSpec Studio"

    private val MARK = Key.create<Boolean>("featherspec.studio.file")

    fun create(): VirtualFile {
        val file = LightVirtualFile(NAME, FileTypes.PLAIN_TEXT, "")
        file.putUserData(MARK, true)
        return file
    }

    fun matches(file: VirtualFile): Boolean = file.getUserData(MARK) == true
}
