package com.gregorbiswanger.featherspec.spike

import com.intellij.openapi.fileEditor.FileEditor
import com.intellij.openapi.fileEditor.FileEditorPolicy
import com.intellij.openapi.fileEditor.FileEditorProvider
import com.intellij.openapi.fileEditor.FileEditorState
import com.intellij.openapi.fileEditor.FileEditorStateLevel
import com.intellij.openapi.fileTypes.FileTypes
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.UserDataHolderBase
import com.intellij.openapi.vfs.VirtualFile
import com.intellij.testFramework.LightVirtualFile
import com.intellij.ui.jcef.JBCefBrowser
import com.intellij.ui.jcef.JBCefJSQuery
import java.beans.PropertyChangeListener
import javax.swing.JComponent

const val SPIKE_FILE_NAME = "FeatherSpec Studio spike"

class SpikeEditorProvider : FileEditorProvider {
    override fun accept(project: Project, file: VirtualFile): Boolean {
        return file.name == SPIKE_FILE_NAME
    }

    override fun createEditor(project: Project, file: VirtualFile): FileEditor {
        return SpikeEditor()
    }

    override fun getEditorTypeId(): String = "FeatherSpecSpikeEditor"

    override fun getPolicy(): FileEditorPolicy = FileEditorPolicy.HIDE_DEFAULT_EDITOR

    companion object {
        fun newFile(): VirtualFile = LightVirtualFile(SPIKE_FILE_NAME, FileTypes.PLAIN_TEXT, "")
    }
}

class SpikeEditor : UserDataHolderBase(), FileEditor {
    private val browser = JBCefBrowser()
    private val query = JBCefJSQuery.create(browser)
    private val resources = SpikeResources(
        query.inject("request"),
        SpikeTheme.bodyClass(),
    )

    init {
        query.addHandler { request ->
            if (Regex("\"type\"\\s*:\\s*\"hello\"").containsMatchIn(request)) {
                postHello()
            }
            null
        }
        browser.jbCefClient.addRequestHandler(SpikeRequestHandler(resources), browser.cefBrowser)
        browser.loadURL("$SPIKE_ORIGIN/index.html")
    }

    private fun postHello() {
        val reply = SpikeResources.readResource("hello-reply.json")?.toString(Charsets.UTF_8) ?: return
        browser.cefBrowser.executeJavaScript(
            "(function (reply) { ['shell', 'board', 'overview', 'detail'].forEach(function (key) { window.postMessage(reply[key], '*'); }); })($reply);",
            SPIKE_ORIGIN,
            0,
        )
    }

    override fun getComponent(): JComponent = browser.component

    override fun getPreferredFocusedComponent(): JComponent? = browser.component

    override fun getName(): String = SPIKE_FILE_NAME

    override fun getState(level: FileEditorStateLevel): FileEditorState = FileEditorState.INSTANCE

    override fun setState(state: FileEditorState) {
    }

    override fun isModified(): Boolean = false

    override fun isValid(): Boolean = true

    override fun addPropertyChangeListener(listener: PropertyChangeListener) {
    }

    override fun removePropertyChangeListener(listener: PropertyChangeListener) {
    }

    override fun dispose() {
        browser.dispose()
    }
}
