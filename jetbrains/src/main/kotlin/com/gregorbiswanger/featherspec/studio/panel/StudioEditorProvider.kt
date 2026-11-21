package com.gregorbiswanger.featherspec.studio.panel

import com.gregorbiswanger.featherspec.studio.StudioProjectService
import com.intellij.openapi.fileEditor.FileEditor
import com.intellij.openapi.fileEditor.FileEditorPolicy
import com.intellij.openapi.fileEditor.FileEditorProvider
import com.intellij.openapi.project.DumbAware
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.VirtualFile

class StudioEditorProvider : FileEditorProvider, DumbAware {
    override fun accept(project: Project, file: VirtualFile): Boolean = StudioFile.matches(file)

    override fun createEditor(project: Project, file: VirtualFile): FileEditor =
        StudioEditor(project.getService(StudioProjectService::class.java))

    override fun getEditorTypeId(): String = "FeatherSpecStudioEditor"

    override fun getPolicy(): FileEditorPolicy = FileEditorPolicy.HIDE_DEFAULT_EDITOR
}
