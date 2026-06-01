import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
function isReceipt(value) {
    if (typeof value !== "object" || value === null)
        return false;
    const candidate = value;
    return (candidate.receiptFormatVersion === "0.1" &&
        typeof candidate.receiptHash === "string" &&
        typeof candidate.manifestHash === "string" &&
        typeof candidate.validatedAt === "string" &&
        typeof candidate.actionability?.score === "number");
}
async function collectJsonFiles(inputDir) {
    const entries = await readdir(inputDir, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
        const fullPath = path.join(inputDir, entry.name);
        if (entry.isDirectory()) {
            files.push(...(await collectJsonFiles(fullPath)));
        }
        else if (entry.isFile() && entry.name.toLowerCase().endsWith(".json")) {
            files.push(fullPath);
        }
    }
    return files;
}
export async function loadReceipts(inputDir) {
    const files = await collectJsonFiles(inputDir);
    const receipts = [];
    for (const file of files) {
        try {
            const parsed = JSON.parse(await readFile(file, "utf8"));
            if (isReceipt(parsed))
                receipts.push(parsed);
        }
        catch {
            // Ignore unrelated or malformed JSON files; validation belongs to the CLI.
        }
    }
    return receipts;
}
export function summarizeReceipts(receipts) {
    const reportTypes = {};
    let valid = 0;
    let scoreSum = 0;
    for (const receipt of receipts) {
        if (receipt.validation.valid)
            valid += 1;
        scoreSum += receipt.actionability.score;
        reportTypes[receipt.manifest.reportType] = (reportTypes[receipt.manifest.reportType] ?? 0) + 1;
    }
    return {
        total: receipts.length,
        valid,
        invalid: receipts.length - valid,
        averageScore: receipts.length === 0 ? 0 : Math.round(scoreSum / receipts.length),
        reportTypes,
        recent: [...receipts]
            .sort((a, b) => Date.parse(b.validatedAt) - Date.parse(a.validatedAt))
            .slice(0, 10)
    };
}
function escapeHtml(input) {
    return input
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}
function renderBreakdown(stats) {
    const entries = Object.entries(stats.reportTypes).sort(([a], [b]) => a.localeCompare(b));
    if (entries.length === 0)
        return "<p>No report types recorded yet.</p>";
    return `<ul class="breakdown">${entries
        .map(([type, count]) => `<li><span>${escapeHtml(type)}</span><strong>${count}</strong></li>`)
        .join("")}</ul>`;
}
export function renderDashboardHtml(stats) {
    const generatedAt = new Date().toISOString();
    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>ReproGate Dashboard</title>
  <style>
    :root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; background: #f7f8fb; color: #172033; }
    header { background: #172033; color: white; padding: 28px clamp(18px, 4vw, 48px); }
    main { max-width: 1120px; margin: 0 auto; padding: 28px clamp(18px, 4vw, 48px) 48px; }
    h1, h2 { margin: 0; letter-spacing: 0; }
    header p { color: #d8deeb; margin: 8px 0 0; }
    .stats { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); margin: 24px 0; }
    .stat, section { background: #fff; border: 1px solid #dfe4ef; border-radius: 8px; padding: 18px; }
    .stat span { color: #566278; font-size: 0.9rem; }
    .stat strong { display: block; font-size: 2rem; margin-top: 6px; }
    section { margin-top: 18px; }
    .breakdown { list-style: none; padding: 0; margin: 14px 0 0; display: grid; gap: 8px; }
    .breakdown li { display: flex; justify-content: space-between; border-bottom: 1px solid #edf0f6; padding-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 0.95rem; }
    th, td { border-bottom: 1px solid #edf0f6; padding: 10px 8px; text-align: left; vertical-align: top; }
    th { color: #566278; font-weight: 600; }
    code { font-family: "SFMono-Regular", Consolas, monospace; font-size: 0.85em; word-break: break-all; }
    .valid { color: #137a44; font-weight: 700; }
    .invalid { color: #b42318; font-weight: 700; }
  </style>
</head>
<body>
  <header>
    <h1>ReproGate Dashboard</h1>
    <p>Static local report generated ${escapeHtml(generatedAt)}. No remote tracking or database required.</p>
  </header>
  <main>
    <div class="stats" aria-label="Summary statistics">
      <div class="stat"><span>Manifests</span><strong>${stats.total}</strong></div>
      <div class="stat"><span>Valid</span><strong>${stats.valid}</strong></div>
      <div class="stat"><span>Invalid</span><strong>${stats.invalid}</strong></div>
      <div class="stat"><span>Average score</span><strong>${stats.averageScore}</strong></div>
    </div>
    <section>
      <h2>Report Type Breakdown</h2>
      ${renderBreakdown(stats)}
    </section>
    <section>
      <h2>Recently Verified Reports</h2>
      <table>
        <thead>
          <tr><th>Validated</th><th>Project</th><th>Type</th><th>Score</th><th>Status</th><th>Receipt hash</th></tr>
        </thead>
        <tbody>
          ${stats.recent.length === 0
        ? '<tr><td colspan="6">No receipts found.</td></tr>'
        : stats.recent
            .map((receipt) => `<tr>
            <td>${escapeHtml(receipt.validatedAt)}</td>
            <td>${escapeHtml(receipt.manifest.projectName)}</td>
            <td>${escapeHtml(receipt.manifest.reportType)}</td>
            <td>${receipt.actionability.score}</td>
            <td class="${receipt.validation.valid ? "valid" : "invalid"}">${receipt.validation.valid ? "valid" : "invalid"}</td>
            <td><code>${escapeHtml(receipt.receiptHash)}</code></td>
          </tr>`)
            .join("")}
        </tbody>
      </table>
    </section>
  </main>
</body>
</html>
`;
}
export async function generateDashboard(inputDir, outputDir) {
    const receipts = await loadReceipts(inputDir);
    const stats = summarizeReceipts(receipts);
    await mkdir(outputDir, { recursive: true });
    const outputPath = path.join(outputDir, "index.html");
    await writeFile(outputPath, renderDashboardHtml(stats), "utf8");
    return { outputPath, stats };
}
//# sourceMappingURL=index.js.map