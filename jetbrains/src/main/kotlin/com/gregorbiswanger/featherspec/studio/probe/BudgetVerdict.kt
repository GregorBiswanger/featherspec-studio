package com.gregorbiswanger.featherspec.studio.probe

enum class Verdict(val label: String) {
    PASSED("passed"),
    TREND("trend"),
    FAILED("failed"),
    INFO("info"),
}

data class BudgetRow(
    val name: String,
    val measured: Long,
    val budget: Long,
    val limit: Long,
    val os: String,
    val verdict: Verdict,
)

/**
 * PD-111: the decision whether a measured time is within its budget, free of the platform and of the IDE.
 * Linux is the hard gate with the budget of the spec. Windows and macOS run the same budget as a trend:
 * it fails from 1.5 times the budget. A value that was not measured fails everywhere.
 */
object BudgetVerdict {
    const val TREND_FACTOR_PERCENT = 150L
    const val NO_BUDGET = -1L

    fun isTrendOs(os: String): Boolean {
        val name = os.lowercase()
        return name.contains("windows") || name.contains("mac") || name.contains("darwin")
    }

    /** [exclusive]: the budget is "below" (a value equal to it is over), otherwise "at most". */
    fun judge(name: String, measured: Long, budget: Long, os: String, exclusive: Boolean = false): BudgetRow {
        val trend = isTrendOs(os)
        val limit = if (trend) budget * TREND_FACTOR_PERCENT / 100 else budget
        val verdict = when {
            measured < 0 -> Verdict.FAILED
            !over(measured, budget, exclusive) -> Verdict.PASSED
            trend && measured < limit -> Verdict.TREND
            else -> Verdict.FAILED
        }
        return BudgetRow(name, measured, budget, limit, os, verdict)
    }

    /** A value without a budget: it is shown and never fails. */
    fun info(name: String, measured: Long, os: String): BudgetRow = BudgetRow(name, measured, NO_BUDGET, NO_BUDGET, os, Verdict.INFO)

    /** The line of a failed row, with the wording of the earlier checks. */
    fun problem(row: BudgetRow): String? = when {
        row.verdict != Verdict.FAILED -> null
        row.measured < 0 -> "${row.name} was not observed"
        isTrendOs(row.os) -> "${row.name} took ${row.measured} ms, the limit on ${row.os} is ${row.limit} ms (1.5 times the budget of ${row.budget} ms)"
        else -> "${row.name} took ${row.measured} ms, the budget is ${row.budget} ms"
    }

    fun table(title: String, rows: List<BudgetRow>): String {
        val out = StringBuilder()
        out.append("### ").append(title).append("\n\n")
        out.append("| Check | Measured (ms) | Budget (ms) | Limit (ms) | OS | Result |\n")
        out.append("| --- | ---: | ---: | ---: | --- | --- |\n")
        rows.forEach { row ->
            val measured = if (row.measured < 0) "not observed" else row.measured.toString()
            val budget = if (row.budget == NO_BUDGET) "-" else row.budget.toString()
            val limit = if (row.limit == NO_BUDGET) "-" else row.limit.toString()
            out.append("| ${row.name} | $measured | $budget | $limit | ${row.os} | ${row.verdict.label} |\n")
        }
        return out.append("\n").toString()
    }

    private fun over(measured: Long, budget: Long, exclusive: Boolean): Boolean =
        if (exclusive) measured >= budget else measured > budget
}
