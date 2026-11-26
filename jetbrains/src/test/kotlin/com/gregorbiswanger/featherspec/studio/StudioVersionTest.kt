package com.gregorbiswanger.featherspec.studio

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class StudioVersionTest {
    @Test
    fun `the version comes from the plugin configuration through the generated resource`() {
        assertEquals("0.1.0", StudioVersion.value)
    }
}
