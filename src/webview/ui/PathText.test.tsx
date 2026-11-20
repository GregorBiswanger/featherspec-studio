import { afterEach, describe, expect, it } from 'vitest';
import { mount } from '../testing/dom';
import { PathText } from './PathText';

const mounted: Array<{ unmount(): void }> = [];

afterEach(() => {
    for (const entry of mounted.splice(0)) {
        entry.unmount();
    }
});

async function html(node: React.ReactElement): Promise<HTMLElement> {
    const result = await mount(node);
    mounted.push(result);
    return result.container;
}

function breaks(container: HTMLElement): string {
    return container.innerHTML.replace(/<span class="path-seg">([^<]*)<\/span>/g, '$1').replace(/<wbr>/g, '|');
}

describe('0022 AC-002: a path breaks only after a slash', () => {
    it('puts a break opportunity after each slash of a path and never after a hyphen or a dot', async () => {
        const container = await html(<PathText path=".specs/active/0022-layout-and-signal.plan.md" />);
        expect(breaks(container)).toBe('.specs/|active/|0022-layout-and-signal.plan.md');
    });

    it('keeps the text content as it was', async () => {
        const container = await html(<PathText path=".specs/active/0022-layout-and-signal.plan.md" />);
        expect(container.textContent).toBe('.specs/active/0022-layout-and-signal.plan.md');
    });

    it('0022 AC-015: puts a break opportunity after a final separator too, as it says "each", and the text stays whole', async () => {
        const container = await html(<PathText path="folder/" />);
        expect(breaks(container)).toBe('folder/|');
        expect(container.textContent).toBe('folder/');
        expect(breaks(await html(<PathText path="a-b." />))).toBe('a-b.');
        expect(breaks(await html(<PathText command="open .specs/active/" />))).toBe('open .specs/|active/|');
    });

    it('0022 AC-015: a path without a separator gets no break opportunity at all', async () => {
        expect(breaks(await html(<PathText path="readme" />))).toBe('readme');
    });

    it('puts breaks into the path arguments of a command and not into the command, a word or a flag', async () => {
        const container = await html(<PathText command="/sdd-plan .specs/active/0001-a.md" />);
        expect(breaks(container)).toBe('/sdd-plan .specs/|active/|0001-a.md');
        expect(container.textContent).toBe('/sdd-plan .specs/active/0001-a.md');
    });

    it('0033 AC-006: every slash-free segment is one nowrap-able unit, so a hyphenated file name has no break opportunity', async () => {
        const container = await html(<PathText command="Implement T-001 of .specs/active/0001-restaurant-rechnung-aufteilen.plan.md" />);
        expect([...container.querySelectorAll('.path-seg')].map((unit) => unit.textContent)).toEqual(['.specs/', 'active/', '0001-restaurant-rechnung-aufteilen.plan.md']);
        expect(container.querySelectorAll('wbr')).toHaveLength(2);
        expect(container.textContent).toBe('Implement T-001 of .specs/active/0001-restaurant-rechnung-aufteilen.plan.md');
    });

    it('leaves a command without a path argument whole', async () => {
        const container = await html(<PathText command="/sdd-plan" />);
        expect(container.innerHTML).toBe('/sdd-plan');
        const prose = await html(<PathText command="Then, in the same chat, if nothing blocks: continue" />);
        expect(prose.querySelector('wbr')).toBeNull();
    });
});
