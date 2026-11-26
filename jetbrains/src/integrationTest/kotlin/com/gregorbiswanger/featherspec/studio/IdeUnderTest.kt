package com.gregorbiswanger.featherspec.studio

import com.intellij.driver.client.Driver
import com.intellij.driver.sdk.waitForIndicators
import kotlin.time.Duration.Companion.minutes

object IdeUnderTest {
    const val DEFAULT = "2025.3.1"

    val version: String =
        System.getProperty("featherspec.ide")?.takeIf { it.isNotBlank() }
            ?: System.getenv("FEATHERSPEC_IDE")?.takeIf { it.isNotBlank() }
            ?: DEFAULT
}

/**
 * IU 2026.3 loads bundled plugins dynamically about 40 s after the first smart mode (license mode switch),
 * which re-runs indexing, so the probe must not start inside that window: wait, go quiet, wait again.
 */
fun Driver.settleAfterStartup() {
    waitForIndicators(5.minutes)
    Thread.sleep(15_000)
    waitForIndicators(5.minutes)
}
