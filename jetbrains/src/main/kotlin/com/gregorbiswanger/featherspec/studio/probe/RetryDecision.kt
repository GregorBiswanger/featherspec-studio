package com.gregorbiswanger.featherspec.studio.probe

/**
 * PD-111, amended: on Linux a smoke run that misses only time budgets is repeated once; the repeat decides.
 * Free of the platform and of the IDE. A value that was not observed is a functional problem, not a time miss.
 */
object RetryDecision {
    const val MAX_RUNS = 2

    fun isLinux(os: String): Boolean = os.lowercase().contains("linux")

    fun timeProblems(rows: List<BudgetRow>): List<String> =
        rows.filter { it.verdict == Verdict.FAILED && it.measured >= 0 }.mapNotNull { BudgetVerdict.problem(it) }

    fun onlyTimeBudgetsMissed(problems: List<String>, rows: List<BudgetRow>): Boolean {
        val time = timeProblems(rows).toSet()
        return problems.isNotEmpty() && problems.all { it in time }
    }

    fun shouldRepeat(os: String, run: Int, problems: List<String>, rows: List<BudgetRow>): Boolean =
        isLinux(os) && run < MAX_RUNS && onlyTimeBudgetsMissed(problems, rows)

    fun title(base: String, run: Int, repeated: Boolean): String = when {
        run > 1 -> "$base, run $run of $MAX_RUNS (repeat, decides)"
        repeated -> "$base, run $run of $MAX_RUNS, repeated because only time budgets missed"
        else -> base
    }
}
