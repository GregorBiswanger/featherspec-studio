package com.gregorbiswanger.featherspec.studio

import com.gregorbiswanger.featherspec.studio.ports.FilePorts
import com.gregorbiswanger.featherspec.studio.ports.Folder
import com.gregorbiswanger.featherspec.studio.ports.HostOs
import com.gregorbiswanger.featherspec.studio.ports.MediumPorts
import com.gregorbiswanger.featherspec.studio.ports.ProjectFolders
import com.gregorbiswanger.featherspec.studio.ports.SpecWatch
import com.gregorbiswanger.featherspec.studio.ports.UiMemoryState
import com.gregorbiswanger.featherspec.studio.runtime.CoreRuntime
import com.gregorbiswanger.featherspec.studio.runtime.CoreState
import com.gregorbiswanger.featherspec.studio.runtime.CoreStateHolder
import com.gregorbiswanger.featherspec.studio.runtime.UnavailableKind
import com.intellij.ide.plugins.PluginManagerCore
import com.intellij.ide.trustedProjects.TrustedProjects
import com.intellij.openapi.Disposable
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.application.PathManager
import com.intellij.openapi.application.ReadAction
import com.intellij.openapi.components.Service
import com.intellij.openapi.diagnostic.thisLogger
import com.intellij.openapi.extensions.PluginId
import com.intellij.openapi.project.Project
import com.intellij.openapi.roots.ModuleRootEvent
import com.intellij.openapi.roots.ModuleRootListener
import com.intellij.openapi.roots.ProjectRootManager
import com.intellij.openapi.util.Disposer
import com.intellij.ui.jcef.JBCefApp
import java.util.concurrent.atomic.AtomicBoolean

private const val PLUGIN_ID = "com.gregorbiswanger.featherspec.studio"

@Service(Service.Level.PROJECT)
class StudioProjectService(private val project: Project) : Disposable {
    val state = CoreStateHolder()

    @Volatile
    var startedAtNanos: Long = 0L

    @Volatile
    var runtime: CoreRuntime? = null
        private set

    private val started = AtomicBoolean(false)

    @Volatile
    private var lastFolders: List<Folder> = emptyList()

    private val projectBase: String = project.basePath.orEmpty()

    private val specWatch: SpecWatch by lazy {
        SpecWatch({ event, payload -> runtime?.dispatch(event, payload) }, this@StudioProjectService)
    }

    val host: HostRouter = HostRouter(
        router = CallRouter(
            files = FilePorts()::answer,
            medium = MediumPorts.under(PathManager.getSystemDir(), HostOs.windows)::answer,
            memory = { name, args -> UiMemoryState.getInstance().memory.answer(name, args, projectBase) },
            watch = { name, args -> specWatch.answer(name, args) },
        ),
        resolve = { id, json -> runtime?.resolve(id, json) },
        execute = { block -> ApplicationManager.getApplication().executeOnPooledThread(Runnable { block() }) },
    )

    fun start() {
        if (!started.compareAndSet(false, true)) {
            return
        }
        if (!JBCefApp.isSupported()) {
            state.set(CoreState.Unavailable(UnavailableKind.UNSUPPORTED))
            return
        }
        ApplicationManager.getApplication().executeOnPooledThread(Runnable { prepare() })
    }

    override fun dispose() {
        runtime = null
    }

    private fun prepare() {
        try {
            val config = configJson()
            ApplicationManager.getApplication().invokeLater { launch(config) }
        } catch (failure: Exception) {
            fail(failure)
        }
    }

    private fun launch(config: String) {
        try {
            if (Disposer.isDisposed(this)) {
                return
            }
            val client = JBCefApp.getInstance().createClient()
            Disposer.register(this, client)
            val created = CoreRuntime(client, host, state, this)
            created.startedAtNanos = startedAtNanos
            runtime = created
            project.messageBus.connect(this).subscribe(
                ModuleRootListener.TOPIC,
                object : ModuleRootListener {
                    override fun rootsChanged(event: ModuleRootEvent) {
                        ApplicationManager.getApplication().executeOnPooledThread(Runnable { sendFolders() })
                    }
                },
            )
            created.start(config)
        } catch (failure: Exception) {
            fail(failure)
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
        return CoreConfig.json(
            platform = CoreConfig.platform(HostOs.windows, HostOs.mac),
            studioVersion = PluginManagerCore.getPlugin(PluginId.getId(PLUGIN_ID))?.version ?: "0.0.0",
            settings = emptyMap(),
            trusted = TrustedProjects.isProjectTrusted(project),
            folders = folders,
            memory = UiMemoryState.getInstance().memory.forProject(projectBase),
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
