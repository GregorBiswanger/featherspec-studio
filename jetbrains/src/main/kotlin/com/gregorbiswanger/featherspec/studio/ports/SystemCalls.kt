package com.gregorbiswanger.featherspec.studio.ports

import com.gregorbiswanger.featherspec.studio.panel.StudioFile
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.fileEditor.FileEditorManagerEx
import com.intellij.openapi.fileEditor.OpenFileDescriptor
import com.intellij.openapi.ide.CopyPasteManager
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.io.FileUtil
import com.intellij.openapi.vfs.LocalFileSystem
import com.intellij.openapi.vfs.VirtualFile
import java.awt.datatransfer.StringSelection
import javax.swing.SwingConstants

private const val OK_NULL = "{\"ok\":null}"

class SystemCalls(private val project: Project) {
    fun answer(name: String, argsJson: String): String? = when (name) {
        "clipboard.write" -> copy(argsJson)
        "editor.open" -> open(argsJson)
        else -> null
    }

    private fun copy(argsJson: String): String {
        val text = EditorOpen.clipboardText(argsJson) ?: throw IllegalArgumentException("clipboard.write needs text")
        ApplicationManager.getApplication().invokeAndWait {
            CopyPasteManager.getInstance().setContents(StringSelection(text))
        }
        return OK_NULL
    }

    private fun open(argsJson: String): String {
        val request = EditorOpen.parse(argsJson) ?: throw IllegalArgumentException("editor.open needs root and key")
        val path = EditorOpen.resolve(request) ?: return EditorOpen.reply(EditorOpen.NOT_FOUND)
        val file = LocalFileSystem.getInstance().refreshAndFindFileByPath(FileUtil.toSystemIndependentName(path.toString()))
            ?: return EditorOpen.reply(EditorOpen.NOT_FOUND)
        var outcome = EditorOpen.NOT_FOUND
        ApplicationManager.getApplication().invokeAndWait {
            if (!project.isDisposed) {
                navigate(request, file)
                outcome = EditorOpen.OPENED
            }
        }
        return EditorOpen.reply(outcome)
    }

    private fun navigate(request: OpenRequest, file: VirtualFile) {
        val selected = FileEditorManager.getInstance(project).selectedFiles.firstOrNull()
        val studioActive = selected != null && StudioFile.matches(selected)
        if (EditorOpen.placement(request.place, studioActive) == Placement.BESIDE) {
            splitBeside(file)
        }
        OpenFileDescriptor(project, file, EditorOpen.zeroBasedLine(request.line), 0).navigate(true)
    }

    private fun splitBeside(file: VirtualFile) {
        runCatching {
            val window = FileEditorManagerEx.getInstanceEx(project).currentWindow ?: return
            val wanted = listOf<Class<*>>(
                Int::class.javaPrimitiveType!!,
                Boolean::class.javaPrimitiveType!!,
                VirtualFile::class.java,
                Boolean::class.javaPrimitiveType!!,
            )
            val split = window.javaClass.methods.firstOrNull { it.name == "split" && it.parameterTypes.toList() == wanted } ?: return
            split.invoke(window, SwingConstants.VERTICAL, true, file, true)
        }
    }
}
