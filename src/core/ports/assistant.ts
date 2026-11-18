export interface CommandPort {
    execute(command: string, args: readonly unknown[]): Promise<unknown>;
}
