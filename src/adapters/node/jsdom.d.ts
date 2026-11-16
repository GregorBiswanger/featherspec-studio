declare module 'jsdom' {
    export class VirtualConsole {
        on(event: 'jsdomError', listener: (error: Error) => void): this;
        on(event: 'error', listener: (...args: unknown[]) => void): this;
    }

    export interface JSDOMOptions {
        runScripts?: 'dangerously' | 'outside-only';
        pretendToBeVisual?: boolean;
        virtualConsole?: VirtualConsole;
    }

    export interface JsdomElement {
        textContent: string | null;
    }

    export interface JsdomDocument {
        body: JsdomElement;
        querySelector(selector: string): JsdomElement | null;
        querySelectorAll(selector: string): Iterable<JsdomElement>;
    }

    export interface JsdomWindow {
        document: JsdomDocument;
        MessageEvent: new (type: string, init: { data: unknown }) => unknown;
        eval(script: string): unknown;
        addEventListener(type: 'error', listener: (event: { message: string }) => void): void;
        dispatchEvent(event: unknown): boolean;
    }

    export class JSDOM {
        constructor(html?: string, options?: JSDOMOptions);
        readonly window: JsdomWindow;
    }
}
