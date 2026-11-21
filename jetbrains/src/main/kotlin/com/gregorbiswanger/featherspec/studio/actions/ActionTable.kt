package com.gregorbiswanger.featherspec.studio.actions

import com.gregorbiswanger.featherspec.studio.runtime.CoreState
import com.gregorbiswanger.featherspec.studio.runtime.UnavailableKind

enum class Target { CORE, SETTINGS }

enum class Need { NONE, SPEC, STEP, PLAN, MAP }

data class ActionRow(
    val id: String,
    val title: String,
    val target: Target,
    val command: String,
    val args: String,
    val needs: Need,
)

data class RowSelection(val args: String, val step: Boolean, val plan: Boolean, val map: Boolean)

sealed interface Outcome {
    data class Notice(val kind: UnavailableKind) : Outcome
    data object Settings : Outcome
    data class Invoke(val command: String, val args: String) : Outcome
    data object Skip : Outcome
}

object ActionTable {
    const val ID_PREFIX = "featherspec.studio."
    const val TREE_POPUP_ID = "featherspec.studio.TreePopup"

    private const val NO_ARGS = "{}"

    private fun core(name: String, title: String, command: String, args: String = NO_ARGS, needs: Need = Need.NONE) =
        ActionRow(ID_PREFIX + name, title, Target.CORE, command, args, needs)

    private fun area(name: String, title: String, area: String) =
        core(name, title, "open", "{\"via\":\"area\",\"area\":\"$area\"}")

    val rows: List<ActionRow> = listOf(
        core("open", "FeatherSpec Studio: Open", "open", "{\"via\":\"start\"}"),
        area("openOverview", "FeatherSpec Studio: Open Overview", "overview"),
        area("openBoard", "FeatherSpec Studio: Open Board", "board"),
        area("openPlanMap", "FeatherSpec Studio: Open Plan Map", "planMap"),
        core("copyNextStep", "FeatherSpec Studio: Copy Next Step", "copyNextStep"),
        core("setup", "FeatherSpec Studio: Set Up FeatherSpec", "setup"),
        core("copyMergePrompt", "FeatherSpec Studio: Copy Merge Prompt", "copyMergePrompt"),
        core("selectProject", "FeatherSpec Studio: Select Project", "selectProject"),
        core("refresh", "FeatherSpec Studio: Refresh", "refresh"),
        ActionRow(ID_PREFIX + "openSettings", "FeatherSpec Studio: Open Settings", Target.SETTINGS, "", NO_ARGS, Need.NONE),
        core("tree.copyNextStep", "Copy Next Step", "tree.copy", needs = Need.STEP),
        core("tree.openSpec", "Open Spec", "tree.openSpec", needs = Need.SPEC),
        core("tree.openPlan", "Open Plan", "tree.openPlan", needs = Need.PLAN),
        core("tree.showInPlanMap", "Show in Plan Map", "tree.showInPlanMap", needs = Need.MAP),
    )

    val titleActionIds: List<String> = listOf(
        ID_PREFIX + "open",
        ID_PREFIX + "refresh",
        ID_PREFIX + "openSettings",
        ID_PREFIX + "copyNextStep",
    )

    val popupActionIds: List<String> = listOf(
        ID_PREFIX + "tree.openSpec",
        ID_PREFIX + "tree.openPlan",
        ID_PREFIX + "tree.showInPlanMap",
        ID_PREFIX + "tree.copyNextStep",
    )

    fun byId(id: String?): ActionRow? = if (id == null) null else rows.firstOrNull { it.id == id }
}

object ActionRules {
    fun enabled(row: ActionRow, selection: RowSelection?): Boolean = when (row.needs) {
        Need.NONE -> true
        Need.SPEC -> selection != null
        Need.STEP -> selection?.step == true
        Need.PLAN -> selection?.plan == true
        Need.MAP -> selection?.map == true
    }

    fun outcome(row: ActionRow, selection: RowSelection?, state: CoreState): Outcome {
        if (!enabled(row, selection)) {
            return Outcome.Skip
        }
        if (row.target == Target.SETTINGS) {
            return Outcome.Settings
        }
        if (state is CoreState.Unavailable) {
            return Outcome.Notice(state.kind)
        }
        val args = if (row.needs == Need.NONE) row.args else selection?.args ?: row.args
        return Outcome.Invoke(row.command, args)
    }
}
