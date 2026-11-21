package com.gregorbiswanger.featherspec.studio

import com.google.gson.JsonArray
import com.google.gson.JsonElement
import com.google.gson.JsonObject
import com.gregorbiswanger.featherspec.studio.ports.Folder

object CoreConfig {
    fun platform(windows: Boolean, mac: Boolean): String = when {
        windows -> "win32"
        mac -> "darwin"
        else -> "linux"
    }

    fun json(
        platform: String,
        studioVersion: String,
        settings: Map<String, JsonElement>,
        trusted: Boolean,
        folders: List<Folder>,
        memory: Map<String, String>,
    ): String = JsonObject().apply {
        addProperty("host", "jetbrains")
        addProperty("platform", platform)
        addProperty("studioVersion", studioVersion)
        add("settings", JsonObject().apply { settings.forEach { (key, value) -> add(key, value) } })
        addProperty("trusted", trusted)
        add("folders", JsonArray().apply { folders.forEach { add(it.toJson()) } })
        add("memory", JsonObject().apply { memory.forEach { (key, value) -> addProperty(key, value) } })
    }.toString()

    fun foldersEvent(folders: List<Folder>): String = JsonObject().apply {
        add("folders", JsonArray().apply { folders.forEach { add(it.toJson()) } })
    }.toString()
}
