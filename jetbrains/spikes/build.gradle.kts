import org.gradle.api.artifacts.component.ModuleComponentIdentifier
import org.jetbrains.kotlin.gradle.dsl.KotlinVersion

plugins {
    kotlin("jvm") version "2.4.21"
}

repositories {
    mavenCentral()
}

dependencies {
    implementation("org.graalvm.polyglot:polyglot:25.0.4")
    implementation("org.graalvm.polyglot:js:25.0.4")
    testImplementation("org.junit.jupiter:junit-jupiter:5.13.4")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher:1.13.4")
}

kotlin {
    jvmToolchain(21)
    compilerOptions {
        languageVersion = KotlinVersion.KOTLIN_2_2
        apiVersion = KotlinVersion.KOTLIN_2_2
    }
}

val polyglotJars = configurations.testRuntimeClasspath.map { classpath ->
    classpath.incoming.artifacts.artifacts
        .filter { artifact ->
            val group = (artifact.id.componentIdentifier as? ModuleComponentIdentifier)?.group.orEmpty()
            group.startsWith("org.graalvm") || group.startsWith("com.ibm.icu")
        }
        .joinToString(File.pathSeparator) { it.file.absolutePath }
}

tasks.test {
    useJUnitPlatform()
    systemProperty("spike.build", layout.buildDirectory.get().asFile.absolutePath)
    systemProperty("spike.polyglotJars", polyglotJars.get())
}
