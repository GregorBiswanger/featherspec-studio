package com.gregorbiswanger.featherspec.studio

/**
 * The plugin's own version, written by the Gradle task `studioVersionResource` from the plugin configuration.
 * The platform calls that return it are internal API from 2026.3 on, and the Marketplace verifier rejects them.
 */
object StudioVersion {
    private const val RESOURCE = "/com/gregorbiswanger/featherspec/studio/studio-version.txt"
    private const val UNKNOWN = "0.0.0"

    val value: String by lazy { read() }

    private fun read(): String =
        runCatching {
            StudioVersion::class.java.getResourceAsStream(RESOURCE)?.use { it.readBytes().toString(Charsets.UTF_8).trim() }
        }.getOrNull()?.takeIf { it.isNotEmpty() } ?: UNKNOWN
}
