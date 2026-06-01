export interface DockerSafeRunOptions {
    repoDir: string;
    commands: string[];
    image?: string;
    timeoutSeconds?: number;
    cpus?: string;
    memory?: string;
}
export interface DockerInvocation {
    executable: "docker";
    args: string[];
    displayCommand: string;
    originalCommand: string;
    timeoutSeconds: number;
}
export declare function assertSafeCommand(command: string): void;
export declare function parseCommandWords(command: string): string[];
export declare function buildDockerSafeRunInvocations(options: DockerSafeRunOptions): DockerInvocation[];
//# sourceMappingURL=safe-run.d.ts.map