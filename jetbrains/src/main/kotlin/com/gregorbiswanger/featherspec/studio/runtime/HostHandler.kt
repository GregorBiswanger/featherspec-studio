package com.gregorbiswanger.featherspec.studio.runtime

interface HostHandler {
    fun call(id: String, name: String, args: String)

    fun emit(channel: String, payload: String)
}
