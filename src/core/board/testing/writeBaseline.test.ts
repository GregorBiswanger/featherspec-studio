import { describe, expect, it } from 'vitest';
import { writeBaseline } from './nextStepSnapshot';

describe.skipIf(process.env.FEATHERSPEC_WRITE_BASELINE !== '1')('0028 T-001: writes the Baseline snapshots (once, on the Baseline commit)', () => {
    it('writes one snapshot file per fixture project and case fixture', async () => {
        expect(await writeBaseline()).toBeGreaterThan(30);
    });
});
