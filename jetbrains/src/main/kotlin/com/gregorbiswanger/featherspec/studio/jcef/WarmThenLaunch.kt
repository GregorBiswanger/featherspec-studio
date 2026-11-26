package com.gregorbiswanger.featherspec.studio.jcef

/**
 * The first JBCefApp.getInstance() initialises JCEF and takes about 2.4 s. Done on the EDT it freezes the IDE, so it
 * runs on a background thread first and the EDT launch is queued only after it. A failing warm-up is swallowed: the
 * unchanged launch reports the failure as before. A disposed owner queues nothing.
 */
internal class WarmThenLaunch(
    private val background: (() -> Unit) -> Unit,
    private val edt: (() -> Unit) -> Unit,
    private val disposed: () -> Boolean,
    private val warm: () -> Unit,
    private val launch: () -> Unit,
) {
    fun run() {
        background {
            try {
                warm()
            } catch (ignored: Throwable) {
                // launch() on the EDT reports the failure
            }
            if (!disposed()) {
                edt { launch() }
            }
        }
    }
}
