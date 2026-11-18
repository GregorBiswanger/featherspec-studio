import { describe, expect, it } from 'vitest';
import type { SettingPort } from '../ports/host';
import { createSettingsSource } from '../settings/settingsSource';
import { ASSISTANT_KEY, extensionPresence, offerOf } from './offer';
import { createFakeAssistantHost } from './testing/fakeAssistantHost';

const EXTENSION_A = 'GitHub.copilot-chat';
const EXTENSION_B = 'anthropic.claude-code';
const OTHER = 'openai.chatgpt';

const VALUES: [string, unknown][] = [
    ['none', 'none'],
    ['copilot', 'copilot'],
    ['claudeCode', 'claudeCode'],
    ['codex', 'codex'],
    ['empty string', ''],
    ['42', 42],
    ['unset', undefined],
];

const PRESENT: [string, string[]][] = [
    ['all three', [EXTENSION_A, EXTENSION_B, OTHER]],
    ['none', []],
    ['only the other assistant (Copilot value)', [EXTENSION_B, OTHER]],
    ['only the other assistant (claudeCode value)', [EXTENSION_A, OTHER]],
    ['only the unlisted assistant', [OTHER]],
];

function expected(value: unknown, present: readonly string[]): { assistant: string } | undefined {
    if (value === 'copilot' && present.includes(EXTENSION_A)) {
        return { assistant: 'copilot' };
    }
    if (value === 'claudeCode' && present.includes(EXTENSION_B)) {
        return { assistant: 'claudeCode' };
    }
    return undefined;
}

describe('0024 AC-002: the offer', () => {
    it('the key is assistant', () => {
        expect(ASSISTANT_KEY).toBe('assistant');
    });

    for (const [valueName, value] of VALUES) {
        for (const [presentName, present] of PRESENT) {
            it(`value ${valueName} with ${presentName}: ${expected(value, present) === undefined ? 'no offer' : 'offered'}`, () => {
                expect(offerOf(value, present)).toEqual(expected(value, present));
            });
        }
    }

    it('the extension ID is matched as §6.2 writes it, not in another letter case', () => {
        expect(offerOf('copilot', [EXTENSION_A.toLowerCase()])).toBeUndefined();
        expect(offerOf('claudeCode', ['Anthropic.Claude-Code'])).toBeUndefined();
        expect(offerOf('copilot', [EXTENSION_A])).toEqual({ assistant: 'copilot' });
    });

    it('negative control: a codex value typed by hand with its extension present is never offered', () => {
        expect(offerOf('codex', [OTHER, EXTENSION_A, EXTENSION_B])).toBeUndefined();
        expect(offerOf(['copilot'], [EXTENSION_A])).toBeUndefined();
        expect(offerOf({ assistant: 'copilot' }, [EXTENSION_A])).toBeUndefined();
        expect(offerOf(' ' + 'copilot', [EXTENSION_A])).toBeUndefined();
    });
});

describe('0024 AC-002: extensionPresence reads the two assistant extensions and follows their changes', () => {
    it('read lists exactly the present IDs of the two assistants, never another extension', () => {
        const host = createFakeAssistantHost();
        const presence = extensionPresence(host);
        expect(presence.read()).toEqual([]);
        host.install(OTHER);
        expect(presence.read()).toEqual([]);
        host.install(EXTENSION_B);
        expect(presence.read()).toEqual([EXTENSION_B]);
        host.install(EXTENSION_A);
        expect([...(presence.read() as string[])].sort()).toEqual([EXTENSION_B, EXTENSION_A].sort());
        host.uninstall(EXTENSION_B);
        expect(presence.read()).toEqual([EXTENSION_A]);
    });

    it('a present extension counts although it is not active yet', () => {
        const host = createFakeAssistantHost();
        host.install(EXTENSION_A, { active: false });
        expect(extensionPresence(host).read()).toEqual([EXTENSION_A]);
    });

    it('onDidChange fires on an extensions change and stops after dispose', () => {
        const host = createFakeAssistantHost();
        const presence = extensionPresence(host);
        let calls = 0;
        const subscription = presence.onDidChange(() => (calls += 1));
        host.fireExtensionsChanged();
        expect(calls).toBe(1);
        subscription.dispose();
        host.fireExtensionsChanged();
        expect(calls).toBe(1);
        expect(host.listeners()).toBe(0);
    });
});

describe('0024 AC-002: the offer source re-reads on a setting change and on an extensions change', () => {
    function world(initial: unknown) {
        const host = createFakeAssistantHost();
        let value = initial;
        const listeners = new Set<() => void>();
        const setting: SettingPort = {
            read: () => value,
            onDidChange(listener) {
                listeners.add(listener);
                return { dispose: () => void listeners.delete(listener) };
            },
        };
        const source = createSettingsSource([setting, extensionPresence(host)], ([chosen, present]) => offerOf(chosen, present as string[]));
        return {
            host,
            source,
            set(next: unknown) {
                value = next;
                [...listeners].forEach((listener) => listener());
            },
        };
    }

    it('a setting change and an extension install each notify and give the new offer', () => {
        const w = world('claudeCode');
        let calls = 0;
        w.source.onDidChange(() => (calls += 1));
        expect(w.source.read()).toBeUndefined();
        w.host.install(EXTENSION_B);
        w.host.fireExtensionsChanged();
        expect(calls).toBe(1);
        expect(w.source.read()).toEqual({ assistant: 'claudeCode' });
        w.set('copilot');
        expect(calls).toBe(2);
        expect(w.source.read()).toBeUndefined();
        w.host.install(EXTENSION_A);
        w.host.fireExtensionsChanged();
        expect(w.source.read()).toEqual({ assistant: 'copilot' });
        w.host.uninstall(EXTENSION_A);
        w.host.fireExtensionsChanged();
        expect(w.source.read()).toBeUndefined();
        expect(calls).toBe(4);
    });
});
