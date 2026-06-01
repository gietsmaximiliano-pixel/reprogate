import { z } from "zod";
export declare const SUPPORTED_SCHEMA_VERSION: "0.1";
export declare const RECEIPT_FORMAT_VERSION: "0.1";
export declare const reportTypes: readonly ["bug", "regression", "performance", "compatibility", "security"];
export type ReportType = (typeof reportTypes)[number];
export declare const evidenceKinds: readonly ["fixture", "log", "screenshot", "trace", "other"];
export type EvidenceKind = (typeof evidenceKinds)[number];
export declare function isSafeRelativePath(input: string): boolean;
export declare const evidenceFileSchema: z.ZodObject<{
    path: z.ZodEffects<z.ZodString, string, string>;
    sha256: z.ZodEffects<z.ZodString, string, string>;
    kind: z.ZodDefault<z.ZodEnum<["fixture", "log", "screenshot", "trace", "other"]>>;
    description: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    path: string;
    sha256: string;
    kind: "fixture" | "log" | "screenshot" | "trace" | "other";
    description?: string | undefined;
}, {
    path: string;
    sha256: string;
    kind?: "fixture" | "log" | "screenshot" | "trace" | "other" | undefined;
    description?: string | undefined;
}>;
export declare const environmentSchema: z.ZodObject<{
    os: z.ZodString;
    runtime: z.ZodOptional<z.ZodString>;
    dependencies: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
}, "strict", z.ZodTypeAny, {
    os: string;
    runtime?: string | undefined;
    dependencies?: Record<string, string> | undefined;
}, {
    os: string;
    runtime?: string | undefined;
    dependencies?: Record<string, string> | undefined;
}>;
export declare const reproGateManifestSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<"0.1">;
    reportType: z.ZodEnum<["bug", "regression", "performance", "compatibility", "security"]>;
    projectName: z.ZodString;
    affectedVersion: z.ZodString;
    environment: z.ZodObject<{
        os: z.ZodString;
        runtime: z.ZodOptional<z.ZodString>;
        dependencies: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    }, "strict", z.ZodTypeAny, {
        os: string;
        runtime?: string | undefined;
        dependencies?: Record<string, string> | undefined;
    }, {
        os: string;
        runtime?: string | undefined;
        dependencies?: Record<string, string> | undefined;
    }>;
    summary: z.ZodString;
    expectedBehavior: z.ZodString;
    actualBehavior: z.ZodString;
    stepsToReproduce: z.ZodArray<z.ZodString, "many">;
    commands: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    safeFixturePaths: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodString, string, string>, "many">>;
    logFiles: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodString, string, string>, "many">>;
    screenshots: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodString, string, string>, "many">>;
    externalEvidenceLinks: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    redactionNotes: z.ZodOptional<z.ZodString>;
    aiAssisted: z.ZodBoolean;
    humanReviewed: z.ZodBoolean;
    evidenceFiles: z.ZodOptional<z.ZodArray<z.ZodObject<{
        path: z.ZodEffects<z.ZodString, string, string>;
        sha256: z.ZodEffects<z.ZodString, string, string>;
        kind: z.ZodDefault<z.ZodEnum<["fixture", "log", "screenshot", "trace", "other"]>>;
        description: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        path: string;
        sha256: string;
        kind: "fixture" | "log" | "screenshot" | "trace" | "other";
        description?: string | undefined;
    }, {
        path: string;
        sha256: string;
        kind?: "fixture" | "log" | "screenshot" | "trace" | "other" | undefined;
        description?: string | undefined;
    }>, "many">>;
    createdAt: z.ZodString;
}, "strict", z.ZodTypeAny, {
    schemaVersion: "0.1";
    reportType: "bug" | "regression" | "performance" | "compatibility" | "security";
    projectName: string;
    affectedVersion: string;
    environment: {
        os: string;
        runtime?: string | undefined;
        dependencies?: Record<string, string> | undefined;
    };
    summary: string;
    expectedBehavior: string;
    actualBehavior: string;
    stepsToReproduce: string[];
    aiAssisted: boolean;
    humanReviewed: boolean;
    createdAt: string;
    commands?: string[] | undefined;
    safeFixturePaths?: string[] | undefined;
    logFiles?: string[] | undefined;
    screenshots?: string[] | undefined;
    externalEvidenceLinks?: string[] | undefined;
    redactionNotes?: string | undefined;
    evidenceFiles?: {
        path: string;
        sha256: string;
        kind: "fixture" | "log" | "screenshot" | "trace" | "other";
        description?: string | undefined;
    }[] | undefined;
}, {
    schemaVersion: "0.1";
    reportType: "bug" | "regression" | "performance" | "compatibility" | "security";
    projectName: string;
    affectedVersion: string;
    environment: {
        os: string;
        runtime?: string | undefined;
        dependencies?: Record<string, string> | undefined;
    };
    summary: string;
    expectedBehavior: string;
    actualBehavior: string;
    stepsToReproduce: string[];
    aiAssisted: boolean;
    humanReviewed: boolean;
    createdAt: string;
    commands?: string[] | undefined;
    safeFixturePaths?: string[] | undefined;
    logFiles?: string[] | undefined;
    screenshots?: string[] | undefined;
    externalEvidenceLinks?: string[] | undefined;
    redactionNotes?: string | undefined;
    evidenceFiles?: {
        path: string;
        sha256: string;
        kind?: "fixture" | "log" | "screenshot" | "trace" | "other" | undefined;
        description?: string | undefined;
    }[] | undefined;
}>;
export type EvidenceFile = z.infer<typeof evidenceFileSchema>;
export type ReproGateManifest = z.infer<typeof reproGateManifestSchema>;
export declare const reproGateJsonSchema: import("zod-to-json-schema").JsonSchema7Type & {
    $schema?: string | undefined;
    definitions?: {
        [key: string]: import("zod-to-json-schema").JsonSchema7Type;
    } | undefined;
};
export interface FieldIssue {
    path: string;
    message: string;
}
export interface EvidenceVerification {
    path: string;
    expectedSha256: string;
    actualSha256?: string;
    exists: boolean;
    matches: boolean;
    error?: string;
}
export interface ManifestValidationResult {
    valid: boolean;
    manifest?: ReproGateManifest;
    missingFields: string[];
    invalidFields: FieldIssue[];
    evidence: EvidenceVerification[];
    errors: string[];
}
export interface ActionabilityResult {
    score: number;
    reasons: string[];
}
export interface ReproGateReceipt {
    receiptFormatVersion: typeof RECEIPT_FORMAT_VERSION;
    validatedAt: string;
    cliVersion: string;
    manifestHash: string;
    manifest: {
        schemaVersion: string;
        reportType: ReportType;
        projectName: string;
        affectedVersion: string;
        summary: string;
        createdAt: string;
    };
    validation: {
        valid: boolean;
        missingFields: string[];
        invalidFields: FieldIssue[];
        evidence: EvidenceVerification[];
    };
    actionability: ActionabilityResult;
    receiptHash: string;
}
export declare function validateManifest(input: unknown): ManifestValidationResult;
export declare function parseManifestText(text: string, sourcePath?: string): unknown;
export declare function readManifestFile(filePath: string): Promise<unknown>;
export declare function normalizeJson(value: unknown): string;
export declare function normalizeManifest(manifest: ReproGateManifest): string;
export declare function sha256Text(text: string): string;
export declare function sha256File(filePath: string): Promise<string>;
export declare function manifestHash(manifest: ReproGateManifest): string;
export declare function resolveEvidencePath(baseDir: string, evidencePath: string): string;
export declare function verifyEvidenceFiles(manifest: ReproGateManifest, baseDir: string): Promise<EvidenceVerification[]>;
export declare function calculateActionabilityScore(manifest: ReproGateManifest | undefined, validation?: Pick<ManifestValidationResult, "valid" | "missingFields" | "invalidFields" | "evidence">): ActionabilityResult;
export declare function validateManifestWithEvidence(input: unknown, baseDir: string): Promise<ManifestValidationResult>;
export declare function createReceipt(options: {
    manifest: ReproGateManifest;
    baseDir: string;
    cliVersion: string;
    validatedAt?: string;
}): Promise<ReproGateReceipt>;
export declare function renderMarkdownSummary(manifest: ReproGateManifest, score?: ActionabilityResult): string;
//# sourceMappingURL=index.d.ts.map