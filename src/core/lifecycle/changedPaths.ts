import type { ProjectRead } from '../specs/readProject';

function fingerprints(project: ProjectRead | undefined, stem: string): Map<string, string> {
    const found = new Map<string, string>();
    if (project === undefined) {
        return found;
    }
    const plans = new Map(project.plans.map((plan) => [plan.key, plan]));
    const notes = new Map(project.returnNotes.map((note) => [note.key, note]));
    for (const spec of project.specs.filter((candidate) => candidate.reference === stem)) {
        found.set(spec.key, JSON.stringify([spec.readable, spec.size, spec.modifiedMs, spec.parsed]));
        for (const key of spec.planKeys) {
            const plan = plans.get(key);
            found.set(key, JSON.stringify([plan?.readable, plan?.size, plan?.modifiedMs, plan?.parsed]));
        }
        for (const key of spec.returnNoteKeys) {
            const note = notes.get(key);
            found.set(key, JSON.stringify([note?.readable, note?.size, note?.modifiedMs, note?.parsed]));
        }
    }
    return found;
}

export function changedPaths(stem: string, previous: ProjectRead | undefined, current: ProjectRead): string[] {
    const before = fingerprints(previous, stem);
    const after = fingerprints(current, stem);
    const keys = new Set([...before.keys(), ...after.keys()]);
    return [...keys].filter((key) => before.get(key) !== after.get(key)).sort();
}
