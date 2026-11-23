package com.gregorbiswanger.featherspec.studio.probe

object BudgetLimits {
    const val CORE_READY_MAX_MS = 12_000L
    const val GEN200_READ_BELOW_MS = 2_000L
    const val GEN200_UPDATE_BELOW_MS = 1_000L
    const val DISCOVER5_BELOW_MS = 2_000L
}

data class Budgets(
    val coreReadyMs: Long,
    val coreCreateMs: Long,
    val coreLoadMs: Long,
    val gen200ReadMs: Long,
    val gen200UpdateMs: Long,
    val gen200HarnessMs: Long,
    val discover5Ms: Long,
    val coreReadyWarmMs: Long,
    val jsHeapBytes: Long?,
) {
    fun toJson(): String =
        "{\"coreReadyMs\":$coreReadyMs,\"coreCreateMs\":$coreCreateMs,\"coreLoadMs\":$coreLoadMs," +
            "\"gen200ReadMs\":$gen200ReadMs,\"gen200UpdateMs\":$gen200UpdateMs,\"gen200HarnessMs\":$gen200HarnessMs,\"discover5Ms\":$discover5Ms," +
            "\"coreReadyWarmMs\":$coreReadyWarmMs,\"jsHeapBytes\":${jsHeapBytes ?: "null"}}"

    fun violations(os: String = "Linux", rows: MutableList<BudgetRow>? = null): List<String> = buildList {
        fun check(key: String, label: String, measured: Long, budget: Long, exclusive: Boolean, reference: String) {
            val row = BudgetVerdict.judge(label, measured, budget, os, exclusive)
            rows?.add(row)
            if (row.verdict != Verdict.FAILED) {
                return
            }
            add(
                when {
                    measured < 0 -> "$key was not measured"
                    BudgetVerdict.isTrendOs(os) -> "$key $measured is not below the limit ${row.limit} (1.5 times the budget $budget; $reference)"
                    exclusive -> "$key $measured is not below $budget ($reference)"
                    else -> "$key $measured is above $budget ($reference)"
                },
            )
        }
        check("coreReadyMs", "R-5 core ready", coreReadyMs, BudgetLimits.CORE_READY_MAX_MS, false, "R-5")
        check("gen200ReadMs", "R-2 read of 200 specs", gen200ReadMs, BudgetLimits.GEN200_READ_BELOW_MS, true, "R-2")
        check("gen200UpdateMs", "R-2 update of 200 specs", gen200UpdateMs, BudgetLimits.GEN200_UPDATE_BELOW_MS, true, "R-2, 0002 AC-018")
        check("discover5Ms", "AC-007 discovery of five roots", discover5Ms, BudgetLimits.DISCOVER5_BELOW_MS, true, "0001 AC-018, 0034 AC-007")
    }

    companion object {
        private const val NANOS_PER_MS = 1_000_000L

        fun elapsedMs(startNanos: Long, endNanos: Long): Long =
            if (startNanos == 0L || endNanos == 0L) -1L else (endNanos - startNanos) / NANOS_PER_MS

        fun parse(text: String): Budgets {
            fun read(name: String): String {
                val match = Regex("\"" + name + "\"\\s*:\\s*(-?\\d+|null)").find(text)
                return requireNotNull(match) { "budgets.json has no field $name" }.groupValues[1]
            }
            return Budgets(
                coreReadyMs = read("coreReadyMs").toLong(),
                coreCreateMs = read("coreCreateMs").toLong(),
                coreLoadMs = read("coreLoadMs").toLong(),
                gen200ReadMs = read("gen200ReadMs").toLong(),
                gen200UpdateMs = read("gen200UpdateMs").toLong(),
                gen200HarnessMs = read("gen200HarnessMs").toLong(),
                discover5Ms = read("discover5Ms").toLong(),
                coreReadyWarmMs = read("coreReadyWarmMs").toLong(),
                jsHeapBytes = read("jsHeapBytes").toLongOrNull(),
            )
        }
    }
}
