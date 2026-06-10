import type { Job } from "../types";

function triggerDownload(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function resultToCsv(result: unknown): string {
  if (Array.isArray(result) && result.length > 0) {
    const rows = result as Record<string, unknown>[];
    const cols = Object.keys(rows[0]);
    return [
      cols.join(","),
      ...rows.map((r) => cols.map((c) => JSON.stringify(r[c] ?? "")).join(",")),
    ].join("\n");
  }

  if (typeof result === "object" && result !== null) {
    // Aggregate result: { column: { fn: value, ... }, ... }
    const agg = result as Record<string, Record<string, unknown>>;
    const rows = [["column", "function", "value"].join(",")];
    for (const [col, fns] of Object.entries(agg)) {
      for (const [fn, val] of Object.entries(fns)) {
        rows.push([col, fn, JSON.stringify(val)].join(","));
      }
    }
    return rows.join("\n");
  }

  return String(result);
}

export function downloadAsCsv(job: Job): void {
  triggerDownload(resultToCsv(job.result), `${job.name}.csv`, "text/csv");
}

export function downloadAsJson(job: Job): void {
  triggerDownload(
    JSON.stringify(job.result, null, 2),
    `${job.name}.json`,
    "application/json",
  );
}
