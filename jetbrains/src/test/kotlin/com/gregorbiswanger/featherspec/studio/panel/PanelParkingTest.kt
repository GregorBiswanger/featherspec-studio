package com.gregorbiswanger.featherspec.studio.panel

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class PanelParkingTest {
    private class Browser(var alive: Boolean = true)

    private val discarded = ArrayList<Browser>()

    private fun parking() = PanelParking<Browser>({ it.alive }, { discarded.add(it) })

    @Test
    fun `AC-042 an empty slot parks one browser and hands it out once`() {
        val parking = parking()
        val browser = Browser()
        assertFalse(parking.occupied)
        assertTrue(parking.park(browser))
        assertTrue(parking.occupied)
        assertTrue(browser === parking.take())
        assertFalse(parking.occupied)
        assertNull(parking.take())
        assertTrue(discarded.isEmpty())
    }

    @Test
    fun `AC-042 at most one browser is parked, the second is left to its owner to dispose`() {
        val parking = parking()
        val first = Browser()
        val second = Browser()
        assertTrue(parking.park(first))
        assertFalse(parking.park(second))
        assertTrue(first === parking.take())
        assertTrue(discarded.isEmpty())
    }

    @Test
    fun `AC-042 two editors at once - only the first takes the parked browser`() {
        val parking = parking()
        val browser = Browser()
        parking.park(browser)
        assertTrue(browser === parking.take())
        assertNull(parking.take())
    }

    @Test
    fun `AC-042 a dead browser is not parked and not handed out`() {
        val parking = parking()
        assertFalse(parking.park(Browser(alive = false)))
        assertFalse(parking.occupied)
        val browser = Browser()
        parking.park(browser)
        browser.alive = false
        assertNull(parking.take())
        assertEquals(listOf(browser), discarded)
        assertFalse(parking.occupied)
    }

    @Test
    fun `AC-042 clear discards the parked browser and the slot takes a new one`() {
        val parking = parking()
        val old = Browser()
        parking.park(old)
        parking.clear()
        assertEquals(listOf(old), discarded)
        assertFalse(parking.occupied)
        parking.clear()
        assertEquals(1, discarded.size)
        assertTrue(parking.park(Browser()))
    }

    @Test
    fun `AC-042 nothing is left after close and a later park is refused`() {
        val parking = parking()
        val browser = Browser()
        parking.park(browser)
        parking.close()
        assertEquals(listOf(browser), discarded)
        assertFalse(parking.occupied)
        assertTrue(parking.shut)
        assertFalse(parking.park(Browser()))
        assertNull(parking.take())
        parking.close()
        assertEquals(1, discarded.size)
    }

    @Test
    fun `AC-042 only a ready, healthy browser that showed a shell frame is parked`() {
        assertTrue(ParkRule.parkable(ready = true, failed = false, shellSeen = true, dead = false))
        assertFalse(ParkRule.parkable(ready = false, failed = false, shellSeen = true, dead = false))
        assertFalse(ParkRule.parkable(ready = true, failed = true, shellSeen = true, dead = false))
        assertFalse(ParkRule.parkable(ready = true, failed = false, shellSeen = false, dead = false))
        assertFalse(ParkRule.parkable(ready = true, failed = false, shellSeen = true, dead = true))
    }
}
