import type { ReproGateReceipt, ReportType } from "@reprogate/spec";
export interface DashboardStats {
    total: number;
    valid: number;
    invalid: number;
    averageScore: number;
    reportTypes: Partial<Record<ReportType, number>>;
    recent: ReproGateReceipt[];
}
export interface DashboardResult {
    outputPath: string;
    stats: DashboardStats;
}
export declare function loadReceipts(inputDir: string): Promise<ReproGateReceipt[]>;
export declare function summarizeReceipts(receipts: ReproGateReceipt[]): DashboardStats;
export declare function renderDashboardHtml(stats: DashboardStats): string;
export declare function generateDashboard(inputDir: string, outputDir: string): Promise<DashboardResult>;
//# sourceMappingURL=index.d.ts.map