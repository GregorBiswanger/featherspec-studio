package com.gregorbiswanger.featherspec.studio.jcef

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
}
