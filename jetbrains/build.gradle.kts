import org.jetbrains.intellij.platform.gradle.IntelliJPlatformType
import org.jetbrains.intellij.platform.gradle.TestFrameworkType
import org.jetbrains.intellij.platform.gradle.tasks.VerifyPluginTask
import org.jetbrains.kotlin.gradle.dsl.KotlinVersion

plugins {
    alias(libs.plugins.kotlin.jvm)
    alias(libs.plugins.intellij.platform)
}

repositories {
    mavenCentral()
    intellijPlatform {
        defaultRepositories()
    }
}

sourceSets {
    create("integrationTest") {
        compileClasspath += sourceSets.main.get().output
        runtimeClasspath += sourceSets.main.get().output
    }
}

val integrationTestImplementation by configurations.getting {
    extendsFrom(configurations.testImplementation.get())
}

val integrationTestRuntimeOnly by configurations.getting

dependencies {
    intellijPlatform {
        intellijIdea("2025.3.1")
        bundledPlugin("com.intellij.modules.jcef")
        bundledPlugin("org.jetbrains.plugins.terminal")
        testFramework(TestFrameworkType.Starter, configurationName = "integrationTestImplementation")
        pluginVerifier()
    }
    integrationTestImplementation(kotlin("stdlib"))
    integrationTestImplementation(libs.junit.jupiter)
    integrationTestImplementation(libs.kodein.di)
    integrationTestImplementation(libs.kotlinx.coroutines.core)
    integrationTestRuntimeOnly(libs.junit.platform.launcher)
    testImplementation(libs.junit.jupiter)
    testRuntimeOnly(libs.junit.platform.launcher)
    testRuntimeOnly(libs.junit4)
}

kotlin {
    jvmToolchain(21)
    compilerOptions {
        languageVersion = KotlinVersion.KOTLIN_2_2
        apiVersion = KotlinVersion.KOTLIN_2_2
    }
}

tasks.processResources {
    from(rootProject.file("../dist/embedded/core.js")) {
        into("embedded")
    }
    from(rootProject.file("../dist/webview")) {
        into("webview")
    }
}

tasks.test {
    useJUnitPlatform()
    testLogging {
        events("failed")
        exceptionFormat = org.gradle.api.tasks.testing.logging.TestExceptionFormat.FULL
        showStandardStreams = true
    }
}

val integrationTest = tasks.register<Test>("integrationTest") {
    val integrationTestSourceSet = sourceSets.getByName("integrationTest")
    testClassesDirs = integrationTestSourceSet.output.classesDirs
    classpath = integrationTestSourceSet.runtimeClasspath
    systemProperty("path.to.build.plugin", tasks.prepareSandbox.get().pluginDirectory.get().asFile)
    systemProperty("featherspec.conformance", rootProject.file("build/conformance").absolutePath)
    systemProperty("featherspec.fixture", rootProject.file("../test/fixtures/studio-0015").absolutePath)
    systemProperty("featherspec.nojcef", providers.gradleProperty("featherspec.nojcef").getOrElse(""))
    systemProperty("featherspec.ide", providers.gradleProperty("featherspec.ide").getOrElse(""))
    useJUnitPlatform()
    testLogging {
        events("failed")
        exceptionFormat = org.gradle.api.tasks.testing.logging.TestExceptionFormat.FULL
        showStandardStreams = true
    }
    outputs.upToDateWhen { false }
    dependsOn(tasks.prepareSandbox)
}

val verifyProduct: String? = providers.gradleProperty("verify.product").orNull
val verifyVersions = listOf("2025.3.1", "2026.3")
val verifyProducts = mapOf(
    "idea" to IntelliJPlatformType.IntellijIdea,
    "webstorm" to IntelliJPlatformType.WebStorm,
    "rider" to IntelliJPlatformType.Rider,
    "pycharm" to IntelliJPlatformType.PyCharm,
    "phpstorm" to IntelliJPlatformType.PhpStorm,
    "goland" to IntelliJPlatformType.GoLand,
    "clion" to IntelliJPlatformType.CLion,
    "rubymine" to IntelliJPlatformType.RubyMine,
    "rustrover" to IntelliJPlatformType.RustRover,
)

intellijPlatform {
    pluginConfiguration {
        id = "com.gregorbiswanger.featherspec.studio"
        name = "FeatherSpec Studio"
        version = "0.1.0"
        vendor {
            name = "Gregor Biswanger"
            url = "https://github.com/GregorBiswanger/featherspec-studio"
        }
        ideaVersion {
            sinceBuild = "253.29346"
            untilBuild = provider { null }
        }
    }
    signing {
        certificateChain = providers.environmentVariable("CERTIFICATE_CHAIN")
        privateKey = providers.environmentVariable("PRIVATE_KEY")
        password = providers.environmentVariable("PRIVATE_KEY_PASSWORD")
    }
    publishing {
        token = providers.environmentVariable("PUBLISH_TOKEN")
        channels = listOf("default")
        hidden = false
    }
    pluginVerification {
        failureLevel = listOf(
            VerifyPluginTask.FailureLevel.COMPATIBILITY_PROBLEMS,
            VerifyPluginTask.FailureLevel.INTERNAL_API_USAGES,
            VerifyPluginTask.FailureLevel.INVALID_PLUGIN,
        )
        ides {
            if (verifyProduct == null || verifyProduct == "recommended") {
                recommended()
            }
            verifyProducts
                .filterKeys { verifyProduct == null || it == verifyProduct }
                .values
                .forEach { type ->
                    verifyVersions.forEach { version -> create(type, version) }
                }
        }
    }
}

// The plugin reads its own version from this resource, because every platform call that returns it
// (PluginManagerCore.getPlugin, PluginManager.getPluginByClass) is internal API from 2026.3 on.
val studioVersionResource = tasks.register("studioVersionResource") {
    val pluginVersion = intellijPlatform.pluginConfiguration.version
    val out = layout.buildDirectory.dir("generated/studio-version")
    inputs.property("version", pluginVersion)
    outputs.dir(out)
    doLast {
        val file = out.get().file("com/gregorbiswanger/featherspec/studio/studio-version.txt").asFile
        file.parentFile.mkdirs()
        file.writeText(pluginVersion.get())
    }
}

sourceSets.main {
    resources.srcDir(studioVersionResource)
}
