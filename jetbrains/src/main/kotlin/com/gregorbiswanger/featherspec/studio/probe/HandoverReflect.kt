package com.gregorbiswanger.featherspec.studio.probe

import com.google.gson.JsonElement
import com.google.gson.JsonNull
import com.google.gson.JsonPrimitive
import com.intellij.openapi.application.ApplicationManager
import java.lang.reflect.InvocationTargetException
import java.lang.reflect.Method
import java.lang.reflect.Modifier
import java.util.concurrent.atomic.AtomicReference

internal object HandoverReflect {
    fun call(target: Any, name: String, vararg args: Any?): Any? {
        val method = find(target.javaClass, name, args.size)
            ?: throw NoSuchMethodException("${target.javaClass.name}.$name/${args.size}")
        try {
            return method.invoke(target, *args)
        } catch (failure: InvocationTargetException) {
            throw failure.targetException
        }
    }

    fun callStatic(className: String, name: String, vararg args: Any?): Any? {
        val type = Class.forName(className)
        val method = type.methods.firstOrNull { it.name == name && it.parameterCount == args.size }
            ?: throw NoSuchMethodException("$className.$name/${args.size}")
        val receiver = if (Modifier.isStatic(method.modifiers)) null else type.getField("INSTANCE").get(null)
        try {
            return method.invoke(receiver, *args)
        } catch (failure: InvocationTargetException) {
            throw failure.targetException
        }
    }

    fun <T> onEdt(block: () -> T): T {
        val holder = AtomicReference<Result<T>>()
        ApplicationManager.getApplication().invokeAndWait { holder.set(runCatching(block)) }
        return holder.get().getOrThrow()
    }

    fun element(value: Any?): JsonElement = when (value) {
        null -> JsonNull.INSTANCE
        is JsonElement -> value
        is Boolean -> JsonPrimitive(value)
        is Number -> JsonPrimitive(value)
        is String -> JsonPrimitive(value)
        else -> JsonPrimitive(value.toString())
    }

    fun safe(block: () -> Any?): JsonElement = try {
        element(block())
    } catch (failure: Throwable) {
        JsonPrimitive(unavailable(failure))
    }

    fun unavailable(failure: Throwable): String {
        var root: Throwable = failure
        while (root.cause != null && root.cause !== root) {
            root = root.cause!!
        }
        return "unavailable: ${root.javaClass.simpleName}: ${root.message}"
    }

    fun strings(value: Any?): List<String> = when (value) {
        null -> emptyList()
        is Array<*> -> value.map { it.toString() }
        is Iterable<*> -> value.map { it.toString() }
        else -> listOf(value.toString())
    }

    private fun find(type: Class<*>, name: String, arity: Int): Method? {
        val seen = LinkedHashSet<Class<*>>()
        collect(type, seen)
        for (candidate in seen) {
            if (!Modifier.isPublic(candidate.modifiers)) {
                continue
            }
            val method = candidate.declaredMethods.firstOrNull {
                it.name == name && it.parameterCount == arity && Modifier.isPublic(it.modifiers) && !it.isBridge && !it.isSynthetic
            }
            if (method != null) {
                return method
            }
        }
        return null
    }

    private fun collect(type: Class<*>?, into: MutableSet<Class<*>>) {
        var current = type
        while (current != null) {
            if (into.add(current)) {
                current.interfaces.forEach { collect(it, into) }
            }
            current = current.superclass
        }
    }
}
