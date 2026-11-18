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
    return container.innerHTML.replace(/<wbr>/g, '|');
}

describe('0022 AC-002: a path breaks only after a separator', () => {
    it('puts a break opportunity after each slash, hyphen and dot of a path and nowhere else', async () => {
        const container = await html(<PathText path=".specs/active/0022-layout-and-signal.plan.md" />);
        expect(breaks(container)).toBe('.|specs/|active/|0022-|layout-|and-|signal.|plan.|md');
    });

    it('keeps the text content as it was', async () => {
        const container = await html(<PathText path=".specs/active/0022-layout-and-signal.plan.md" />);
        expect(container.textContent).toBe('.specs/active/0022-layout-and-signal.plan.md');
    });

    it('0022 AC-015: puts a break opportunity after a final separator too, as it says "each", and the text stays whole', async () => {
        const container = await html(<PathText path="folder/" />);
        expect(breaks(container)).toBe('folder/|');
        expect(container.textContent).toBe('folder/');
        expect(breaks(await html(<PathText path="a-b." />))).toBe('a-|b.|');
        expect(breaks(await html(<PathText command="open .specs/active/" />))).toBe('open .|specs/|active/|');
    });

    it('0022 AC-015: a path without a separator gets no break opportunity at all', async () => {
        expect(breaks(await html(<PathText path="readme" />))).toBe('readme');
    });

    it('puts breaks into the path arguments of a command and not into the command, a word or a flag', async () => {
        const container = await html(<PathText command="/sdd-plan .specs/active/0001-a.md" />);
        expect(breaks(container)).toBe('/sdd-plan .|specs/|active/|0001-|a.|md');
        expect(container.textContent).toBe('/sdd-plan .specs/active/0001-a.md');
    });

    it('leaves a command without a path argument whole', async () => {
        const container = await html(<PathText command="/sdd-plan" />);
        expect(container.innerHTML).toBe('/sdd-plan');
        const prose = await html(<PathText command="Then, in the same chat, if nothing blocks: continue" />);
        expect(prose.querySelector('wbr')).toBeNull();
    });
});
