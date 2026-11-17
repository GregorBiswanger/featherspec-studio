export const SECRET_SAMPLES: Readonly<Record<string, string>> = {
    'github-token': 'ghp_0123456789abcdefghijklmnopqrstuvwxyz',
    'github-fine-grained-token': 'github_pat_11ABCDEFG0123456789_abcdefghijklmnop',
    'anthropic-key': 'sk-ant-api03-ABCDEFGHIJKLMNOPQRSTUV',
    'secret-key': 'sk-0123456789abcdefghijklmnop',
    'bearer-token': 'Bearer abcdef0123456789ABCDEF',
    'private-key-block': '-----BEGIN PRIVATE KEY-----MIIBVgIBADANBgkq-----END PRIVATE KEY-----',
};

export function sampleOf(name: string): string {
    const sample = SECRET_SAMPLES[name];
    if (sample === undefined) {
        throw new Error(`No sample for secret pattern ${name}`);
    }
    return sample;
}
