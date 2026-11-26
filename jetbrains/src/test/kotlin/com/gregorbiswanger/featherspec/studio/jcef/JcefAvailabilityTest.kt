package com.gregorbiswanger.featherspec.studio.jcef

import com.gregorbiswanger.featherspec.studio.runtime.CoreState
import com.gregorbiswanger.featherspec.studio.runtime.UnavailableKind
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class JcefAvailabilityTest {
    @Test
    fun `AC-030 supported and loaded at 9 s is available`() {
        assertEquals(Availability.AVAILABLE, JcefAvailability.decide(true, 9_000L, 9_000L))
    }

    @Test
    fun `AC-030 not supported is unsupported whatever else is known`() {
        assertEquals(Availability.UNSUPPORTED, JcefAvailability.decide(false, null, 0L))
        assertEquals(Availability.UNSUPPORTED, JcefAvailability.decide(false, null, 60_000L))
        assertEquals(Availability.UNSUPPORTED, JcefAvailability.decide(false, 100L, 100L))
    }

    @Test
    fun `AC-030 supported and not loaded at 30 s is suspended`() {
        assertEquals(Availability.SUSPENDED, JcefAvailability.decide(true, null, 30_000L))
        assertEquals(Availability.SUSPENDED, JcefAvailability.decide(true, null, 45_000L))
    }

    @Test
    fun `AC-030 supported and not loaded at 10 s is pending`() {
        assertEquals(Availability.PENDING, JcefAvailability.decide(true, null, 10_000L))
        assertEquals(Availability.PENDING, JcefAvailability.decide(true, null, 29_999L))
    }

    @Test
    fun `a page that loaded late is still available`() {
        assertEquals(Availability.AVAILABLE, JcefAvailability.decide(true, 31_000L, 31_000L))
    }

    @Test
    fun `the threshold is 30 s`() {
        assertEquals(30_000L, JcefAvailability.SUSPENDED_AFTER_MS)
    }

    private val suspended = CoreState.Unavailable(UnavailableKind.SUSPENDED)

    @Test
    fun `no load after 30 s shows the suspended hint and keeps the core`() {
        assertEquals(suspended, JcefAvailability.nextState(CoreState.Loading, false, 30_000L))
        assertEquals(CoreState.Loading, JcefAvailability.nextState(CoreState.Loading, false, 29_999L))
    }

    @Test
    fun `a load after the suspended hint goes back to loading`() {
        assertEquals(CoreState.Loading, JcefAvailability.nextState(suspended, true, 45_000L))
        assertEquals(suspended, JcefAvailability.nextState(suspended, false, 45_000L))
    }

    @Test
    fun `a load before 30 s never shows suspended`() {
        assertEquals(CoreState.Loading, JcefAvailability.nextState(CoreState.Loading, true, 30_000L))
        assertEquals(CoreState.Loading, JcefAvailability.nextState(CoreState.Loading, true, 5_000L))
    }

    @Test
    fun `unsupported ready and failed are unchanged`() {
        val unsupported = CoreState.Unavailable(UnavailableKind.UNSUPPORTED)
        assertEquals(unsupported, JcefAvailability.nextState(unsupported, true, 60_000L))
        assertEquals(unsupported, JcefAvailability.nextState(unsupported, false, 60_000L))
        assertEquals(CoreState.Ready, JcefAvailability.nextState(CoreState.Ready, false, 60_000L))
        assertEquals(CoreState.Failed("x"), JcefAvailability.nextState(CoreState.Failed("x"), true, 60_000L))
    }
}
