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
    implementation("org.graalvm.polyglot:polyglot:25.0.4")
    implementation("org.graalvm.polyglot:js:25.0.4")
    integrationTestImplementation("org.junit.jupiter:junit-jupiter:5.13.4")
    integrationTestImplementation("org.kodein.di:kodein-di-jvm:7.20.2")
    integrationTestImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-core-jvm:1.10.1")
    integrationTestRuntimeOnly("org.junit.platform:junit-platform-launcher:1.13.4")
}

kotlin {
    jvmToolchain(21)
    compilerOptions {
        languageVersion = KotlinVersion.KOTLIN_2_2
        apiVersion = KotlinVersion.KOTLIN_2_2
    }
}

val v2InputDir = rootProject.file("build/inputs")
val v2Index = layout.buildDirectory.file("v2/inputs.txt")

val writeV2Index = tasks.register("writeV2Index") {
    inputs.dir(v2InputDir)
    outputs.file(v2Index)
    doLast {
        val names = v2InputDir.listFiles { file -> file.extension == "json" }.orEmpty().map { it.name }.sorted()
        v2Index.get().asFile.also { it.parentFile.mkdirs() }.writeText(names.joinToString("\n", postfix = "\n"))
    }
}

tasks.processResources {
    dependsOn(writeV2Index)
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
    from(v2InputDir) {
        into("v2/inputs")
    }
    from(rootProject.file("build/node-expected")) {
        into("v2/node-expected")
    }
    from(v2Index) {
        into("v2")
    }
}

val integrationTest = tasks.register<Test>("integrationTest") {
    val integrationTestSourceSet = sourceSets.getByName("integrationTest")
    testClassesDirs = integrationTestSourceSet.output.classesDirs
    classpath = integrationTestSourceSet.runtimeClasspath
    systemProperty("path.to.build.plugin", tasks.prepareSandbox.get().pluginDirectory.get().asFile)
    systemProperty("spike.fixture", rootProject.file("../../test/fixtures/studio-0015").absolutePath)
    useJUnitPlatform()
    dependsOn(tasks.prepareSandbox)
}
