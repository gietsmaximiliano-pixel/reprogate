export declare const COMMENT_MARKER = "<!-- reprogate-validation-comment -->";
export type ReproGateLabel = "reprogate:complete" | "reprogate:needs-info" | "reprogate:manual-review";
export interface IssueAnalysis {
    label: ReproGateLabel;
    comment: string;
    score: number;
    valid: boolean;
    missingFields: string[];
    invalidFields: Array<{
        path: string;
        message: string;
    }>;
}
export declare function extractReproGateBlock(issueBody: string): string | undefined;
export declare function selectLabel(options: {
    valid: boolean;
    score: number;
    reportType?: string;
    parseFailed?: boolean;
}): ReproGateLabel;
export declare function sanitizeCommentText(input: string): string;
export declare function analyzeIssueBody(issueBody: string): IssueAnalysis;
export declare function findExistingReproGateComment(comments: Array<{
    id: number;
    body?: string | null;
}>): number | undefined;
//# sourceMappingURL=index.d.ts.map