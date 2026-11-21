package com.gregorbiswanger.featherspec.studio.ports

import java.nio.charset.StandardCharsets
import java.nio.file.Path
import java.security.MessageDigest

object StoreLocation {
    private const val HASH_LENGTH = 16

    fun storeDir(systemPath: Path, rootUri: String, windows: Boolean): Path {
        val key = if (windows) rootUri.lowercase() else rootUri
        val digest = MessageDigest.getInstance("SHA-256").digest(key.toByteArray(StandardCharsets.UTF_8))
        val hex = digest.joinToString("") { "%02x".format(it) }.substring(0, HASH_LENGTH)
        return systemPath.resolve("featherspec-studio").resolve("projects").resolve(hex)
    }
}
