package com.gregorbiswanger.featherspec.studio.assistant

import java.lang.reflect.InvocationTargetException
import java.lang.reflect.Method
import java.lang.reflect.Modifier

internal object TerminalReflect {
    fun call(target: Any, name: String, vararg args: Any?): Any? {
        val method = find(target.javaClass, name, args.size)
            ?: throw NoSuchMethodException("${target.javaClass.name}.$name/${args.size}")
        try {
            return method.invoke(target, *args)
        } catch (failure: InvocationTargetException) {
            throw failure.targetException
        }
    }

    fun callOrNull(target: Any, name: String, vararg args: Any?): Any? = try {
        call(target, name, *args)
    } catch (failure: NoSuchMethodException) {
        null
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
