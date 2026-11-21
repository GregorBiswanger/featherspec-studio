import { describe, expect, it } from 'vitest';
import { JETBRAINS_TEXTS, TERM_PAIRS, hostKindOf, translateTerms } from './vocabulary';
import { RESTRICTED_TEXT, STATE_LABELS, ACTION_LABELS, panelStateLines } from './texts';

describe('AC-039 and PD-099: the host kind is JetBrains only for the exact value', () => {
    it('reads jetbrains as jetbrains and every other value, or none, as vscode', () => {
        expect(hostKindOf('jetbrains')).toBe('jetbrains');
        expect(hostKindOf('vscode')).toBe('vscode');
        expect(hostKindOf(undefined)).toBe('vscode');
        expect(hostKindOf('JetBrains')).toBe('vscode');
        expect(hostKindOf('')).toBe('vscode');
    });
});

describe('AC-039: VS Code texts are identical by construction', () => {
    it('leaves every text unchanged for vscode, including every VS Code term of the table', () => {
        for (const [vscode] of TERM_PAIRS) {
            expect(translateTerms(vscode, 'vscode')).toBe(vscode);
        }
        expect(translateTerms(RESTRICTED_TEXT, 'vscode')).toBe(RESTRICTED_TEXT);
        expect(translateTerms('Open a folder to use FeatherSpec Studio.', 'vscode')).toBe('Open a folder to use FeatherSpec Studio.');
    });
});

describe('AC-019 and PD-099: the JetBrains terms replace the VS Code terms', () => {
    it('translates the S7 note sentence to the project wording, longest pair first', () => {
        expect(translateTerms(RESTRICTED_TEXT, 'jetbrains')).toBe('This project is not trusted. Setting up FeatherSpec needs a trusted project.');
    });

    it('translates the S7 label and the trust action', () => {
        expect(translateTerms(STATE_LABELS.S7, 'jetbrains')).toBe('Safe Mode');
        expect(translateTerms(ACTION_LABELS.manageTrust, 'jetbrains')).toBe('Trust Project');
    });

    it('translates the no-project sentence with and without its period', () => {
        expect(translateTerms('No FeatherSpec project found in this workspace.', 'jetbrains')).toBe('No FeatherSpec project found in this project.');
        expect(translateTerms('No FeatherSpec project found in this workspace', 'jetbrains')).toBe('No FeatherSpec project found in this project');
    });

    it('translates the trusted-workspace sentence, the folder sentences and the write lock notice', () => {
        expect(translateTerms('Setting up FeatherSpec needs a trusted workspace.', 'jetbrains')).toBe('Setting up FeatherSpec needs a trusted project.');
        expect(translateTerms('Every folder of this workspace is already a FeatherSpec project.', 'jetbrains')).toBe('Every folder of this project is already a FeatherSpec project.');
        expect(translateTerms('No folder of this workspace has files to merge.', 'jetbrains')).toBe('No folder of this project has files to merge.');
        expect(translateTerms("Another VS Code window holds the write lock for this project's status history.", 'jetbrains')).toBe(
            "Another IDE window holds the write lock for this project's status history.",
        );
    });

    it('reads the S5 protocol sentence with the plugin in JetBrains', () => {
        expect(translateTerms('the Studio panel and the extension could not exchange data', 'jetbrains')).toBe(
            'the Studio panel and the plugin could not exchange data',
        );
        expect(translateTerms(panelStateLines({ id: 'S5', reason: { cause: 'protocol' } })[0] ?? '', 'jetbrains')).toBe(
            'The project could not be loaded: the Studio panel and the plugin could not exchange data.',
        );
    });

    it('leaves a text without a term unchanged in JetBrains', () => {
        expect(translateTerms('Open a folder to use FeatherSpec Studio.', 'jetbrains')).toBe('Open a folder to use FeatherSpec Studio.');
    });
});

describe('AC-030: the JetBrains-only texts', () => {
    it('holds the proposed wording of the host texts', () => {
        expect(JETBRAINS_TEXTS.jcefUnsupported).toBe('FeatherSpec Studio needs the embedded browser (JCEF), which this IDE does not support.');
        expect(JETBRAINS_TEXTS.jcefSuspended).toBe("FeatherSpec Studio needs the embedded browser (JCEF), which the operating system's sandbox has suspended.");
        expect(JETBRAINS_TEXTS.openHelp).toBe('Open help');
        expect(JETBRAINS_TEXTS.statusUnavailable).toBe('FeatherSpec unavailable');
        expect(JETBRAINS_TEXTS.helpUrl).toBe('https://github.com/GregorBiswanger/featherspec-studio#jetbrains-ides');
    });

    it('contains no VS Code term of the table', () => {
        for (const value of Object.values(JETBRAINS_TEXTS)) {
            for (const [vscode] of TERM_PAIRS) {
                expect(value).not.toContain(vscode);
            }
        }
    });
});
