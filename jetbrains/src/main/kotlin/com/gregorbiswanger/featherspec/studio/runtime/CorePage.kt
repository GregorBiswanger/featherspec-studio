package com.gregorbiswanger.featherspec.studio.runtime

const val CORE_ORIGIN = "https://studio.featherspec.invalid"

const val CORE_URL = "$CORE_ORIGIN/core.html"

object CorePage {
    fun html(nonce: String, injectJs: String): String {
        val policy = "default-src 'none'; script-src 'nonce-$nonce'"
        return listOf(
            "<!DOCTYPE html>",
            "<html lang=\"en\">",
            "<head>",
            "<meta charset=\"UTF-8\">",
            "<meta http-equiv=\"Content-Security-Policy\" content=\"$policy\">",
            "</head>",
            "<body>",
            "<script nonce=\"$nonce\">window.__featherspecNative = function (frame) { $injectJs };</script>",
            "<script nonce=\"$nonce\" src=\"$CORE_ORIGIN/core.js\"></script>",
            "</body>",
            "</html>",
            "",
        ).joinToString("\n")
    }
}
