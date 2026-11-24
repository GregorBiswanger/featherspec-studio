package com.gregorbiswanger.featherspec.studio

object IdeUnderTest {
    const val DEFAULT = "2025.3.1"

    val version: String =
        System.getProperty("featherspec.ide")?.takeIf { it.isNotBlank() }
            ?: System.getenv("FEATHERSPEC_IDE")?.takeIf { it.isNotBlank() }
            ?: DEFAULT
}
