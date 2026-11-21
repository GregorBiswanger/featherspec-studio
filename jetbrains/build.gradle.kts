import org.jetbrains.intellij.platform.gradle.TestFrameworkType
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
        testFramework(TestFrameworkType.Starter, configurationName = "integrationTestImplementation")
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
    useJUnitPlatform()
    testLogging {
        events("failed")
        exceptionFormat = org.gradle.api.tasks.testing.logging.TestExceptionFormat.FULL
        showStandardStreams = true
    }
    outputs.upToDateWhen { false }
    dependsOn(tasks.prepareSandbox)
}

intellijPlatform {
    pluginConfiguration {
        id = "com.gregorbiswanger.featherspec.studio"
        name = "FeatherSpec Studio"
        version = "0.1.0"
        vendor {
            name = "Gregor Biswanger"
        }
        ideaVersion {
            sinceBuild = "253.29346"
            untilBuild = provider { null }
        }
    }
}
