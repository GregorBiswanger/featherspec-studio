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

dependencies {
    intellijPlatform {
        intellijIdea("2025.3.1")
        bundledPlugin("com.intellij.modules.jcef")
    }
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
