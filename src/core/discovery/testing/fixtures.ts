import * as path from 'path';

export function fixturePath(name: string): string {
    return path.resolve(process.cwd(), 'test', 'fixtures', name);
}
