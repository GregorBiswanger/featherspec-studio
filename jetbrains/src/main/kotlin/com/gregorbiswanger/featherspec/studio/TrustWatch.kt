package com.gregorbiswanger.featherspec.studio

class TrustWatch(initial: Boolean) {
    private var trusted = initial

    @Synchronized
    fun grantedNow(current: Boolean): Boolean {
        val granted = current && !trusted
        trusted = current
        return granted
    }

    companion object {
        const val HELP_URL = "https://www.jetbrains.com/help/idea/project-security.html"
        const val EVENT = "trustGranted"
        const val PAYLOAD = "{}"
    }
}
