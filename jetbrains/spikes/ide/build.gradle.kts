import org.jetbrains.intellij.platform.gradle.TestFrameworkType
import org.jetbrains.kotlin.gradle.dsl.KotlinVersion

plugins {
    kotlin("jvm")
    id("org.jetbrains.intellij.platform")
}

version = "0.1.0-spike"

repositories {
    mavenCentral()
    intellijPlatform {
        defaultRepositories()
    }
}

val integrationTestImplementation by configurations.getting {
    extendsFrom(configurations.testImplementation.get())
}

dependencies {
    intellijPlatform {
        intellijIdea("2025.3.1")
        bundledPlugin("com.intellij.modules.jcef")
        testFramework(TestFrameworkType.Starter, configurationName = "integrationTestImplementation")
    }
    implementation("org.graalvm.polyglot:polyglot:25.0.4")
    implementation("org.graalvm.polyglot:js:25.0.4")
    integrationTestImplementation("org.junit.jupiter:junit-jupiter:5.13.4")
    integrationTestImplementation("org.kodein.di:kodein-di-jvm:7.20.2")
    integrationTestImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-core-jvm:1.10.1")
}

kotlin {
    jvmToolchain(21)
    compilerOptions {
        languageVersion = KotlinVersion.KOTLIN_2_2
        apiVersion = KotlinVersion.KOTLIN_2_2
    }
}

sourceSets {
    create("integrationTest") {
        compileClasspath += sourceSets.main.get().output
        runtimeClasspath += sourceSets.main.get().output
    }
}

tasks.processResources {
    from(rootProject.file("../../dist/webview"))
    from(rootProject.file("build/hello-reply.json"))
    from(rootProject.file("build/core-spike.js")) {
        into("graal")
    }
    from(rootProject.file("build/inputs/studio-0015.json")) {
        into("graal")
    }
    from(rootProject.file("build/node-expected/studio-0015.json")) {
        into("graal")
        rename { "studio-0015.expected.json" }
    }
}

val integrationTest by intellijPlatformTesting.testIdeUi.registering {
    task {
        testClassesDirs = sourceSets.getByName("integrationTest").output.classesDirs
        classpath = sourceSets.getByName("integrationTest").runtimeClasspath
        useJUnitPlatform()
        dependsOn(tasks.buildPlugin)
        systemProperty("path.to.build.plugin", tasks.buildPlugin.get().archiveFile.get().asFile.absolutePath)
        systemProperty("spike.fixture", rootProject.file("../../test/fixtures/studio-0015").absolutePath)
    }
}
