#!/usr/bin/env node
import { validateManifestWithEvidence, type ReproGateManifest } from "@reprogate/spec";
import { Command } from "commander";
export declare const CLI_VERSION = "0.1.0";
interface CommonWriteOptions {
    force?: boolean;
}
export declare function initProject(rootDir: string, options?: CommonWriteOptions): Promise<string[]>;
export declare function loadManifestWithPath(filePath: string): Promise<{
    raw: unknown;
    manifest?: ReproGateManifest;
    validation: Awaited<ReturnType<typeof validateManifestWithEvidence>>;
    baseDir: string;
}>;
export declare function buildProgram(): Command;
export {};
//# sourceMappingURL=index.d.ts.map