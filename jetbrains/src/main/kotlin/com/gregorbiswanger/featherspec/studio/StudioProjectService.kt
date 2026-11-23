package com.gregorbiswanger.featherspec.studio

import com.gregorbiswanger.featherspec.studio.actions.RowSelection
import com.gregorbiswanger.featherspec.studio.assistant.AssistantCalls
import com.gregorbiswanger.featherspec.studio.assistant.AssistantPort
import com.gregorbiswanger.featherspec.studio.assistant.IdeAssistantCalls
import com.gregorbiswanger.featherspec.studio.jcef.Availability
import com.gregorbiswanger.featherspec.studio.jcef.JcefAvailability
import com.gregorbiswanger.featherspec.studio.ports.FilePorts
import com.gregorbiswanger.featherspec.studio.ports.Folder
import com.gregorbiswanger.featherspec.studio.ports.HostOs
import com.gregorbiswanger.featherspec.studio.ports.IdePlugins
import com.gregorbiswanger.featherspec.studio.ports.PluginAvailability
import com.gregorbiswanger.featherspec.studio.ports.PluginsWatch
import com.gregorbiswanger.featherspec.studio.ports.IdeUnsavedDocuments
import com.gregorbiswanger.featherspec.studio.ports.MediumPorts
import com.gregorbiswanger.featherspec.studio.ports.ProjectFolders
import com.gregorbiswanger.featherspec.studio.ports.SpecWatch
import com.gregorbiswanger.featherspec.studio.ports.SystemCalls
import com.gregorbiswanger.featherspec.studio.panel.PanelBrowser
import com.gregorbiswanger.featherspec.studio.panel.PanelParking
import com.gregorbiswanger.featherspec.studio.panel.StudioFile
import com.gregorbiswanger.featherspec.studio.ports.UiMemoryState
import com.gregorbiswanger.featherspec.studio.probe.OpenTimingProbe
import com.gregorbiswanger.featherspec.studio.setup.SetupCalls
import com.gregorbiswanger.featherspec.studio.settings.SettingsTable
import com.gregorbiswanger.featherspec.studio.settings.StudioSettings
import com.gregorbiswanger.featherspec.studio.runtime.CoreRuntime
import com.gregorbiswanger.featherspec.studio.runtime.CoreState
import com.gregorbiswanger.featherspec.studio.runtime.CoreStateHolder
import com.gregorbiswanger.featherspec.studio.runtime.UnavailableKind
import com.gregorbiswanger.featherspec.studio.ui.HostUi
import com.intellij.ide.BrowserUtil
import com.intellij.ide.plugins.PluginManagerCore
import com.intellij.ide.trustedProjects.TrustedProjects
import com.intellij.openapi.Disposable
import com.intellij.openapi.application.ApplicationActivationListener
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.application.PathManager
import com.intellij.openapi.application.ReadAction
import com.intellij.openapi.components.Service
import com.intellij.openapi.diagnostic.thisLogger
import com.intellij.openapi.extensions.PluginId
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.project.Project
import com.intellij.openapi.roots.ModuleRootEvent
import com.intellij.openapi.roots.ModuleRootListener
import com.intellij.openapi.roots.ProjectRootManager
import com.intellij.openapi.util.Disposer
import com.intellij.openapi.vfs.VirtualFile
import com.intellij.openapi.wm.IdeFrame
import com.intellij.ui.jcef.JBCefApp
import com.intellij.ui.jcef.JBCefClient
import com.intellij.util.concurrency.AppExecutorUtil
import java.util.concurrent.TimeUnit
import java.util.concurrent.CompletableFuture
import java.util.concurrent.atomic.AtomicBoolean

private const val PLUGIN_ID = "com.gregorbiswanger.featherspec.studio"

private const val OK_NULL = "{\"ok\":null}"

private val OPENING_COMMANDS = setOf("open", "tree.select", "tree.showInPlanMap")

@Service(Service.Level.PROJECT)
class StudioProjectService(private val project: Project) : Disposable {
    val state = CoreStateHolder()

    @Volatile
    var startedAtNanos: Long = 0L

    @Volatile
    var runtime: CoreRuntime? = null
        private set

    @Volatile
    var client: JBCefClient? = null
        private set

    val studioFile: VirtualFile = StudioFile.create()

    val panelParking = PanelParking<PanelBrowser>({ it.alive }, { if (!Disposer.isDisposed(it)) Disposer.dispose(it) })

    val reloadRequests = Observable(0)

    val selection = Observable<RowSelection?>(null)

    val themeScripts = Observable<String?>(null)

    private val started = AtomicBoolean(false)

    private val config = CompletableFuture<String>()

    @Volatile
    private var lastFolders: List<Folder> = emptyList()

    @Volatile
    private var trustWatch = TrustWatch(false)

    @Volatile
    private var pluginsWatch = PluginsWatch(emptyList())

    private val projectBase: String = project.basePath.orEmpty()

    private val specWatch: SpecWatch by lazy {
        SpecWatch({ event, payload -> runtime?.dispatch(event, payload) }, this@StudioProjectService)
    }

    private val systemCalls = SystemCalls(project)

    private val assistantCalls: AssistantCalls = IdeAssistantCalls(project)

    private val hostUi = HostUi(project) { event, payload -> runtime?.dispatch(event, payload) }

    val host: HostRouter = HostRouter(
        router = CallRouter(
            files = FilePorts(unsaved = IdeUnsavedDocuments())::answer,
            medium = MediumPorts.under(PathManager.getSystemDir(), HostOs.windows)::answer,
            memory = { name, args -> UiMemoryState.getInstance().memory.answer(name, args, projectBase) },
            watch = { name, args -> specWatch.answer(name, args) },
            panel = { name, _ -> panelCall(name) },
            system = { name, args -> systemCalls.answer(name, args) },
            ui = { name, args -> hostUi.answer(name, args) },
            setup = SetupCalls()::answer,
            assistant = AssistantPort(assistantCalls)::answer,
        ),
        resolve = { id, json -> runtime?.resolve(id, json) },
        execute = { block -> ApplicationManager.getApplication().executeOnPooledThread(Runnable { block() }) },
    )

    init {
        hostUi.attach(host)
    }

    fun start() {
        if (!started.compareAndSet(false, true)) {
            return
        }
        if (JcefAvailability.decide(JBCefApp.isSupported(), null, 0L) == Availability.UNSUPPORTED) {
            state.set(CoreState.Unavailable(UnavailableKind.UNSUPPORTED))
            return
        }
        ApplicationManager.getApplication().executeOnPooledThread(Runnable { prepare() })
        ApplicationManager.getApplication().invokeLater { launch() }
    }

    fun openStudio() {
        ApplicationManager.getApplication().invokeLater {
            if (!project.isDisposed) {
                FileEditorManager.getInstance(project).openFile(studioFile, true)
            }
        }
    }

    fun invokeAsync(command: String, args: String) {
        if (command in OPENING_COMMANDS) {
            OpenTimingProbe.requested(this)
        }
        ApplicationManager.getApplication().executeOnPooledThread(
            Runnable {
                runtime?.invoke(command, args)?.whenComplete { _, failure ->
                    if (failure != null) {
                        thisLogger().warn("The FeatherSpec command $command failed", failure)
                    }
                }
            },
        )
    }

    fun dispatchEvent(event: String, payload: String) {
        runtime?.dispatch(event, payload)
    }

    fun recheckTrust() {
        ApplicationManager.getApplication().executeOnPooledThread(
            Runnable {
                try {
                    if (trustWatch.grantedNow(TrustedProjects.isProjectTrusted(project))) {
                        runtime?.dispatch(TrustWatch.EVENT, TrustWatch.PAYLOAD)
                    }
                } catch (failure: Exception) {
                    thisLogger().warn("The FeatherSpec trust state could not be read", failure)
                }
            },
        )
    }

    override fun dispose() {
        panelParking.close()
        hostUi.close()
        runtime = null
        client = null
    }

    private fun panelCall(name: String): String? = when (name) {
        "actions.openStudio" -> {
            openStudio()
            recheckTrust()
            OK_NULL
        }
        "actions.manageTrust" -> {
            BrowserUtil.browse(TrustWatch.HELP_URL)
            recheckTrust()
            OK_NULL
        }
        "actions.reloadPanel" -> {
            reloadRequests.update { it + 1 }
            OK_NULL
        }
        else -> null
    }

    private fun prepare() {
        try {
            config.complete(configJson())
        } catch (failure: Exception) {
            config.completeExceptionally(failure)
        }
    }

    private fun launch() {
        try {
            if (Disposer.isDisposed(this)) {
                return
            }
            val created = JBCefApp.getInstance().createClient()
            Disposer.register(this, created)
            client = created
            val core = CoreRuntime(created, host, state, this)
            core.startedAtNanos = startedAtNanos
            runtime = core
            project.messageBus.connect(this).subscribe(
                ModuleRootListener.TOPIC,
                object : ModuleRootListener {
                    override fun rootsChanged(event: ModuleRootEvent) {
                        ApplicationManager.getApplication().executeOnPooledThread(Runnable { sendFolders() })
                    }
                },
            )
            ApplicationManager.getApplication().messageBus.connect(this).subscribe(
                ApplicationActivationListener.TOPIC,
                object : ApplicationActivationListener {
                    override fun applicationActivated(ideFrame: IdeFrame) {
                        recheckTrust()
                    }
                },
            )
            core.open()
            config.whenComplete { json, failure ->
                if (failure != null) {
                    fail(failure as? Exception ?: RuntimeException(failure))
                } else {
                    core.provideConfig(json)
                }
            }
            watchForSuspension(core)
        } catch (failure: Exception) {
            fail(failure)
        }
    }

    private fun watchForSuspension(core: CoreRuntime) {
        AppExecutorUtil.getAppScheduledExecutorService().schedule(
            Runnable { checkSuspended(core) },
            JcefAvailability.SUSPENDED_AFTER_MS,
            TimeUnit.MILLISECONDS,
        )
    }

    private fun checkSuspended(core: CoreRuntime) {
        if (Disposer.isDisposed(this) || state.value != CoreState.Loading) {
            return
        }
        val loadedAfterMs = if (core.loadedAtNanos == 0L) null else TimeUnit.NANOSECONDS.toMillis(core.loadedAtNanos - core.createdAtNanos)
        if (JcefAvailability.decide(true, loadedAfterMs, JcefAvailability.SUSPENDED_AFTER_MS) != Availability.SUSPENDED) {
            return
        }
        state.set(CoreState.Unavailable(UnavailableKind.SUSPENDED))
        if (state.value is CoreState.Unavailable) {
            runtime = null
            core.dispose()
        }
    }

    fun sendPlugins(plugins: List<String>) {
        val core = runtime ?: return
        if (pluginsWatch.changed(plugins)) {
            core.dispatch("pluginsChanged", PluginAvailability.event(plugins))
        }
    }

    private fun sendFolders() {
        try {
            val folders = currentFolders()
            if (folders != lastFolders) {
                lastFolders = folders
                runtime?.dispatch("foldersChanged", CoreConfig.foldersEvent(folders))
            }
        } catch (failure: Exception) {
            thisLogger().warn("The FeatherSpec folders could not be sent to the core", failure)
        }
    }

    private fun configJson(): String {
        val folders = currentFolders()
        lastFolders = folders
        val trusted = TrustedProjects.isProjectTrusted(project)
        trustWatch = TrustWatch(trusted)
        val plugins = IdePlugins().snapshot()
        pluginsWatch = PluginsWatch(plugins)
        return CoreConfig.json(
            platform = CoreConfig.platform(HostOs.windows, HostOs.mac),
            studioVersion = PluginManagerCore.getPlugin(PluginId.getId(PLUGIN_ID))?.version ?: "0.0.0",
            settings = SettingsTable.values(StudioSettings.getInstance().model()),
            trusted = trusted,
            folders = folders,
            memory = UiMemoryState.getInstance().memory.forProject(projectBase),
            plugins = plugins,
        )
    }

    private fun currentFolders(): List<Folder> {
        val roots = ReadAction.compute<List<String>, RuntimeException> {
            ProjectRootManager.getInstance(project).contentRoots.map { it.path }
        }
        return ProjectFolders.folders(project.basePath, roots)
    }

    private fun fail(failure: Exception) {
        thisLogger().warn("The FeatherSpec core could not be started", failure)
        state.set(CoreState.Failed(failure.message ?: failure.javaClass.simpleName))
    }
}
