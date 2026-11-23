package com.gregorbiswanger.featherspec.studio

import com.gregorbiswanger.featherspec.studio.probe.BudgetRow
import com.gregorbiswanger.featherspec.studio.probe.BudgetVerdict
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.StandardOpenOption

/** PD-111: every measured value goes to the log and, when the variable is set, to the job summary of the run. */
object StepSummary {
    fun publish(title: String, rows: List<BudgetRow>) {
        if (rows.isEmpty()) {
            return
        }
        val text = BudgetVerdict.table(title, rows)
        println(text)
        val target = System.getenv("GITHUB_STEP_SUMMARY")?.takeIf { it.isNotBlank() } ?: return
        try {
            Files.writeString(Path.of(target), text, StandardOpenOption.CREATE, StandardOpenOption.APPEND)
        } catch (failure: java.io.IOException) {
            println("the job summary $target is not writable: $failure")
        }
    }
}
