import { promises as fs } from 'fs';
import * as path from 'path';

export async function snapshotTree(root: string): Promise<string[]> {
    const lines: string[] = [];
    async function walk(directory: string): Promise<void> {
        for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
            const full = path.join(directory, entry.name);
            const stats = await fs.stat(full);
            lines.push(`${path.relative(root, full)}|${stats.size}|${stats.mtimeMs}`);
            if (entry.isDirectory()) {
                await walk(full);
            }
        }
    }
    await walk(root);
    return lines.sort();
}
