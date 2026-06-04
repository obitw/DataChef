import { useState } from "react";

interface Props {
  result: unknown;
}

const PAGE_SIZE = 50;

export default function ResultViewer({ result }: Props) {
  const [page, setPage] = useState(0);

  if (result === null || result === undefined) return null;

  if (Array.isArray(result) && result.length > 0) {
    const columns = Object.keys(result[0] as object);
    const rows = result as Record<string, unknown>[];
    const totalPages = Math.ceil(rows.length / PAGE_SIZE);
    const slice = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    return (
      <div className="overflow-auto rounded-lg border border-gray-200">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((col) => (
                <th
                  key={col}
                  className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {slice.map((row, i) => (
              <tr key={i} className="hover:bg-gray-50">
                {columns.map((col) => (
                  <td key={col} className="px-4 py-2 text-gray-700">
                    {String(row[col] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-2 border-t border-gray-200 text-sm text-gray-600">
            <span>
              {rows.length} lignes — page {page + 1}/{totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1 rounded border disabled:opacity-40"
              >
                Précédent
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page === totalPages - 1}
                className="px-3 py-1 rounded border disabled:opacity-40"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (typeof result === "object" && result !== null) {
    const agg = result as Record<string, Record<string, number>>;
    return (
      <div className="space-y-4">
        {Object.entries(agg).map(([col, fns]) => (
          <div key={col} className="rounded-lg border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700 border-b border-gray-200">
              {col}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-gray-200">
              {Object.entries(fns).map(([fn, val]) => (
                <div key={fn} className="bg-white px-4 py-3">
                  <p className="text-xs text-gray-500 uppercase">{fn}</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {typeof val === "number" ? val.toLocaleString("fr-FR", { maximumFractionDigits: 4 }) : String(val)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <pre className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 overflow-auto">
      {JSON.stringify(result, null, 2)}
    </pre>
  );
}
