import { cutAt } from '../board/shortTitle';

export const TREE_BUDGET = 32;
export const TITLE_FLOOR = 12;

export interface TreeLabelInput {
    number: string;
    title: string;
    description: string;
    command?: string;
}

export interface TreeLabel {
    label: string;
    description: string;
}

export function treeLabel(input: TreeLabelInput): TreeLabel {
    const roomFor = (description: string) => TREE_BUDGET - (input.number.length + 1) - description.length;
    const swap = input.command !== undefined && roomFor(input.description) < TITLE_FLOOR;
    const description = swap ? input.command! : input.description;
    const room = Math.max(roomFor(description), TITLE_FLOOR);
    return { label: `${input.number} ${cutAt(input.title, room)}`, description };
}
