import { describe, expect, it } from 'vitest';
import { runDuration } from './agentCenterDuration';

const START = '2026-11-17T10:00:00.000Z';
const at = (seconds: number) => Date.parse(START) + seconds * 1000;
const ended = (seconds: number) => new Date(at(seconds)).toISOString();

describe('AC-006: duration per BR-04', () => {
    it('Completed, Failed and Cancelled: end time minus start time, as m:ss', () => {
        expect(runDuration({ status: 'Completed', started: START, ended: ended(125) }, at(9999))).toBe('2:05');
        expect(runDuration({ status: 'Failed', started: START, ended: ended(9) }, at(9999))).toBe('0:09');
        expect(runDuration({ status: 'Cancelled', started: START, ended: ended(600) }, at(9999))).toBe('10:00');
    });

    it('an open run: the clock now minus start time, whole seconds, from one hour h:mm:ss', () => {
        for (const status of ['Starting', 'Running', 'WaitingForApproval', 'WaitingForInput'] as const) {
            expect(runDuration({ status, started: START, ended: undefined }, at(61.9)), status).toBe('1:01');
        }
        expect(runDuration({ status: 'Running', started: START, ended: undefined }, at(3599))).toBe('59:59');
        expect(runDuration({ status: 'Running', started: START, ended: undefined }, at(3600))).toBe('1:00:00');
        expect(runDuration({ status: 'Running', started: START, ended: undefined }, at(3600 * 26 + 75))).toBe('26:01:15');
    });

    it('Interrupted, a run without a start time, and an ended run without an end time: "not available"', () => {
        expect(runDuration({ status: 'Interrupted', started: START, ended: ended(30) }, at(40))).toBe('not available');
        expect(runDuration({ status: 'Running', started: undefined, ended: undefined }, at(40))).toBe('not available');
        expect(runDuration({ status: 'Completed', started: undefined, ended: ended(30) }, at(40))).toBe('not available');
        expect(runDuration({ status: 'Completed', started: START, ended: undefined }, at(40))).toBe('not available');
        expect(runDuration({ status: 'Completed', started: 'garbage', ended: ended(30) }, at(40))).toBe('not available');
    });

    it('a clock before the start time shows 0:00, never a negative figure', () => {
        expect(runDuration({ status: 'Running', started: START, ended: undefined }, at(-5))).toBe('0:00');
    });
});
