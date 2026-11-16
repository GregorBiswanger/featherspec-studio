import { afterEach, describe, expect, it } from 'vitest';
import { mount, type Mounted } from '../testing/dom';
import { InlineText } from './InlineText';

let mounted: Mounted | undefined;
afterEach(() => {
    mounted?.unmount();
    mounted = undefined;
});

async function render(text: string): Promise<HTMLElement> {
    mounted = await mount(<InlineText text={text} />);
    return mounted.container;
}

describe('0013 AC-014 InlineText', () => {
    it('AC-014: renders strong, em, code and a link as text plus target in secondary text, no anchor', async () => {
        const container = await render('**b** *i* `c` [plan](x.plan.md)');
        expect(container.querySelector('strong')?.textContent).toBe('b');
        expect(container.querySelector('em')?.textContent).toBe('i');
        expect(container.querySelector('code')?.textContent).toBe('c');
        expect(container.querySelector('a')).toBeNull();
        const link = container.querySelector('.inline-link');
        expect(link?.querySelector('.inline-link-text')?.textContent).toBe('plan');
        expect(link?.querySelector('.inline-link-target')?.textContent).toBe('x.plan.md');
    });

    it('AC-014: HTML in file text shows literally and creates no element', async () => {
        const container = await render('<img src=x onerror=alert(1)> and <b>bold</b>');
        expect(container.textContent).toBe('<img src=x onerror=alert(1)> and <b>bold</b>');
        expect(container.querySelector('img')).toBeNull();
        expect(container.querySelector('b')).toBeNull();
    });
});
