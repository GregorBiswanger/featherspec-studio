import { createEmbeddedHost, type EmbeddedHost } from './main';

declare global {
    var __featherspecNative: (frame: string) => void;
    var FeatherSpecHost: EmbeddedHost;
}

globalThis.FeatherSpecHost = createEmbeddedHost({
    send: (frame) => globalThis.__featherspecNative(frame),
});
