package com.gregorbiswanger.featherspec.studio.ports

import com.intellij.openapi.application.ReadAction
import com.intellij.openapi.fileEditor.FileDocumentManager
import com.intellij.openapi.vfs.LocalFileSystem
import com.intellij.openapi.vfs.VirtualFile
import java.nio.file.Path

class IdeUnsavedDocuments : UnsavedDocuments {
    override fun unsaved(path: Path): Unsaved? = ReadAction.compute<Unsaved?, RuntimeException> {
        val file = find(path)
        val manager = FileDocumentManager.getInstance()
        val document = file?.let { manager.getCachedDocument(it) }
        if (file == null || document == null || !manager.isDocumentUnsaved(document)) {
            null
        } else {
            Unsaved(
                DocumentBytes.encode(document.text, file.charset, file.detectedLineSeparator, file.bom),
                document.modificationStamp,
            )
        }
    }

    private fun find(path: Path): VirtualFile? {
        val fileSystem = LocalFileSystem.getInstance()
        return fileSystem.findFileByNioFile(path) ?: fileSystem.findFileByPath(path.toString().replace('\\', '/'))
    }
}
