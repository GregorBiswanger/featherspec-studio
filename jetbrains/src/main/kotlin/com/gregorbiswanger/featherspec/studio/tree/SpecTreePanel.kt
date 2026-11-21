package com.gregorbiswanger.featherspec.studio.tree

import com.gregorbiswanger.featherspec.studio.StudioProjectService
import com.gregorbiswanger.featherspec.studio.actions.ActionTable
import com.gregorbiswanger.featherspec.studio.actions.NoticeContent
import com.gregorbiswanger.featherspec.studio.actions.RowSelection
import com.gregorbiswanger.featherspec.studio.runtime.UnavailableKind
import com.intellij.icons.AllIcons
import com.intellij.execution.runners.ExecutionUtil
import com.intellij.openapi.Disposable
import com.intellij.openapi.actionSystem.ActionGroup
import com.intellij.openapi.actionSystem.ActionManager
import com.intellij.openapi.actionSystem.ActionPlaces
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.util.IconLoader
import com.intellij.openapi.wm.ToolWindow
import com.intellij.ui.JBColor
import com.intellij.ui.PopupHandler
import com.intellij.ui.ColoredTreeCellRenderer
import com.intellij.ui.ScrollPaneFactory
import com.intellij.ui.SimpleTextAttributes
import com.intellij.ui.treeStructure.Tree
import com.gregorbiswanger.featherspec.studio.runtime.CoreState
import com.intellij.openapi.ui.SimpleToolWindowPanel
import java.awt.Component
import java.awt.event.ActionListener
import java.awt.event.KeyAdapter
import java.awt.event.KeyEvent
import java.awt.event.MouseAdapter
import java.awt.event.MouseEvent
import javax.swing.Icon
import javax.swing.JTree
import javax.swing.SwingUtilities
import javax.swing.ToolTipManager
import javax.swing.event.TreeExpansionEvent
import javax.swing.event.TreeExpansionListener
import javax.swing.tree.DefaultMutableTreeNode
import javax.swing.tree.DefaultTreeModel
import javax.swing.tree.TreeModel
import javax.swing.tree.TreePath

class SpecTreePanel(
    private val service: StudioProjectService,
    private val toolWindow: ToolWindow,
) : SimpleToolWindowPanel(true, true), Disposable {
    private val root = DefaultMutableTreeNode()
    private val model = DefaultTreeModel(root)
    private val tree = TreeView(model)
    private val scroll = ScrollPaneFactory.createScrollPane(tree)
    private var noticeShown: UnavailableKind? = null
    private val expansion = HashMap<String, Boolean>()
    private val baseIcon: Icon = IconLoader.getIcon("/icons/toolWindow.svg", SpecTreePanel::class.java)
    private val unsubscribe = ArrayList<() -> Unit>()

    @Volatile
    private var disposed = false

    private var rebuilding = false
    private var view: SpecTreeView? = null

    init {
        tree.isRootVisible = false
        tree.showsRootHandles = true
        tree.cellRenderer = Renderer()
        ToolTipManager.sharedInstance().registerComponent(tree)
        tree.addTreeExpansionListener(object : TreeExpansionListener {
            override fun treeExpanded(event: TreeExpansionEvent) = remember(event, true)

            override fun treeCollapsed(event: TreeExpansionEvent) = remember(event, false)
        })
        tree.addMouseListener(object : MouseAdapter() {
            override fun mouseClicked(event: MouseEvent) {
                if (SwingUtilities.isLeftMouseButton(event) && event.clickCount == 1) {
                    activate(nodeAt(event.x, event.y))
                }
            }
        })
        tree.addKeyListener(object : KeyAdapter() {
            override fun keyPressed(event: KeyEvent) {
                if (event.keyCode == KeyEvent.VK_ENTER) {
                    activate(tree.selectionPath?.lastPathComponent as? DefaultMutableTreeNode)
                }
            }
        })
        tree.addTreeSelectionListener { publishSelection() }
        tree.addMouseListener(object : PopupHandler() {
            override fun invokePopup(comp: Component, x: Int, y: Int) = showPopup(comp, x, y)
        })
        setContent(scroll)
        toolWindow.setTitleActions(ActionTable.titleActionIds.mapNotNull { ActionManager.getInstance().getAction(it) })
        unsubscribe.add(service.host.tree.onChange { json -> later { accept(json) } })
        unsubscribe.add(service.state.onChange { _ -> later { render() } })
        accept(service.host.tree.value)
    }

    override fun dispose() {
        disposed = true
        service.selection.set(null)
        unsubscribe.forEach { it() }
        unsubscribe.clear()
    }

    private fun later(block: () -> Unit) {
        ApplicationManager.getApplication().invokeLater {
            if (!disposed) {
                block()
            }
        }
    }

    private fun accept(json: String?) {
        val parsed = if (json == null) null else SpecTreeMapping.parse(json)
        if (parsed != null) {
            view = parsed
        }
        render()
    }

    private fun render() {
        val current = view
        val state = service.state.value
        val shown = if (state is CoreState.Ready || state is CoreState.Loading) current?.groups.orEmpty() else emptyList()
        val selected = (tree.selectionPath?.lastPathComponent as? DefaultMutableTreeNode)?.let { idOf(it) }
        rebuilding = true
        try {
            root.removeAllChildren()
            shown.forEach { group ->
                val node = DefaultMutableTreeNode(group)
                group.children.forEach { node.add(DefaultMutableTreeNode(it)) }
                root.add(node)
            }
            model.reload()
            for (index in 0 until root.childCount) {
                val node = root.getChildAt(index) as DefaultMutableTreeNode
                val group = node.userObject as GroupNode
                val path = TreePath(node.path)
                if (expansion[group.id] ?: !group.collapsed) {
                    tree.expandPath(path)
                } else {
                    tree.collapsePath(path)
                }
            }
            if (selected != null) {
                find(root, selected)?.let { tree.selectionPath = TreePath(it.path) }
            }
        } finally {
            rebuilding = false
        }
        showContent((state as? CoreState.Unavailable)?.kind)
        showEmptyText(SpecTreeMapping.emptyContent(current, state))
        val waiting = if (shown.isEmpty()) 0 else current?.waiting ?: 0
        toolWindow.stripeTitle = SpecTreeMapping.title(waiting)
        toolWindow.setIcon(if (waiting >= 1) ExecutionUtil.getLiveIndicator(baseIcon) else baseIcon)
        toolWindow.setTitle(current?.description.orEmpty())
        publishSelection()
    }

    private fun showContent(kind: UnavailableKind?) {
        if (kind == noticeShown) {
            return
        }
        noticeShown = kind
        setContent(if (kind == null) scroll else UnavailableNotice(NoticeContent.of(kind)))
    }

    private fun publishSelection() {
        if (rebuilding) {
            return
        }
        val spec = selectedSpec()
        service.selection.set(spec?.let { RowSelection(it.rowArgs(), it.step, it.plan, it.map) })
    }

    private fun showEmptyText(content: EmptyContent) {
        val text = tree.emptyText
        text.clear()
        content.lines.forEachIndexed { index, line ->
            if (index == 0) {
                text.setText(line)
            } else {
                text.appendLine(line)
            }
        }
        content.actions.forEach { action ->
            text.appendLine(action.label, SimpleTextAttributes.LINK_ATTRIBUTES, ActionListener { call(action.command, action.args) })
        }
    }

    private fun idOf(node: DefaultMutableTreeNode): String? = when (val item = node.userObject) {
        is GroupNode -> item.id
        is SpecNode -> item.id
        else -> null
    }

    private fun find(parent: DefaultMutableTreeNode, id: String): DefaultMutableTreeNode? {
        for (index in 0 until parent.childCount) {
            val child = parent.getChildAt(index) as DefaultMutableTreeNode
            if (idOf(child) == id) {
                return child
            }
            val nested = find(child, id)
            if (nested != null) {
                return nested
            }
        }
        return null
    }

    private fun remember(event: TreeExpansionEvent, expanded: Boolean) {
        if (rebuilding) {
            return
        }
        val group = (event.path.lastPathComponent as? DefaultMutableTreeNode)?.userObject as? GroupNode ?: return
        expansion[group.id] = expanded
    }

    private fun nodeAt(x: Int, y: Int): DefaultMutableTreeNode? =
        tree.getPathForLocation(x, y)?.lastPathComponent as? DefaultMutableTreeNode

    private fun selectedSpec(): SpecNode? =
        (tree.selectionPath?.lastPathComponent as? DefaultMutableTreeNode)?.userObject as? SpecNode

    private fun activate(node: DefaultMutableTreeNode?) {
        val spec = node?.userObject as? SpecNode ?: return
        call("tree.select", spec.rowArgs())
    }

    private fun showPopup(component: Component, x: Int, y: Int) {
        val path = tree.getPathForLocation(x, y) ?: return
        if ((path.lastPathComponent as? DefaultMutableTreeNode)?.userObject !is SpecNode) {
            return
        }
        tree.selectionPath = path
        val group = ActionManager.getInstance().getAction(ActionTable.TREE_POPUP_ID) as? ActionGroup ?: return
        ActionManager.getInstance().createActionPopupMenu(ActionPlaces.POPUP, group).component.show(component, x, y)
    }

    private fun call(command: String, args: String) = service.invokeAsync(command, args)

    private class TreeView(model: TreeModel) : Tree(model) {
        override fun getToolTipText(event: MouseEvent): String? {
            val path = getPathForLocation(event.x, event.y) ?: return null
            return when (val item = (path.lastPathComponent as? DefaultMutableTreeNode)?.userObject) {
                is SpecNode -> item.tooltipHtml
                is GroupNode -> item.tooltipHtml
                else -> null
            }
        }
    }

    private class Renderer : ColoredTreeCellRenderer() {
        override fun customizeCellRenderer(
            tree: JTree,
            value: Any?,
            selected: Boolean,
            expanded: Boolean,
            leaf: Boolean,
            row: Int,
            hasFocus: Boolean,
        ) {
            when (val item = (value as? DefaultMutableTreeNode)?.userObject) {
                is GroupNode -> {
                    setIcon(iconOf(item.icon))
                    append(item.label)
                    append("  " + item.description, SimpleTextAttributes.GRAYED_ATTRIBUTES)
                }
                is SpecNode -> {
                    setIcon(iconOf(item.icon))
                    append(item.label)
                    append("  " + item.description, descriptionStyle(item.tone, selected))
                }
            }
        }

        private fun descriptionStyle(tone: Tone?, selected: Boolean): SimpleTextAttributes =
            if (tone == null || selected) {
                SimpleTextAttributes.GRAYED_ATTRIBUTES
            } else {
                SimpleTextAttributes(SimpleTextAttributes.STYLE_PLAIN, JBColor(tone.light, tone.dark))
            }

        private fun iconOf(icon: NodeIcon): Icon? = when (icon) {
            NodeIcon.PLAY -> AllIcons.Actions.Execute
            NodeIcon.EYE -> AllIcons.General.InspectionsEye
            NodeIcon.CIRCLE_SLASH -> AllIcons.Actions.Cancel
            NodeIcon.LIST_FLAT -> AllIcons.Actions.ListFiles
            NodeIcon.PASS -> AllIcons.RunConfigurations.TestPassed
            NodeIcon.CHECK -> AllIcons.Actions.Checked
            NodeIcon.WARNING -> AllIcons.General.Warning
            NodeIcon.NONE -> null
        }
    }
}
