import { useParams, Link } from "react-router-dom";
import { useJob } from "../hooks/useJobs";
import ResultViewer from "../components/ResultViewer";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  running: "bg-blue-100 text-blue-700",
  done: "bg-green-100 text-green-700",
  error: "bg-red-100 text-red-700",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: job, isLoading } = useJob(id!);

  if (isLoading) {
    return <p className="text-gray-400">Chargement...</p>;
  }

  if (!job) {
    return <p className="text-red-500">Job introuvable.</p>;
  }

  const isActive = job.status === "pending" || job.status === "running";

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link to="/jobs" className="text-sm text-gray-400 hover:text-gray-600">
          ← Jobs
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-900">{job.name}</h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${STATUS_STYLES[job.status]}`}
          >
            {isActive && <span className="animate-pulse">●</span>}
            {job.status}
          </span>
          {isActive && (
            <span className="text-xs text-gray-400 animate-pulse">
              Mise à jour automatique...
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-400">Créé le</p>
            <p className="text-gray-800">{formatDate(job.created_at)}</p>
          </div>
          <div>
            <p className="text-gray-400">Mis à jour</p>
            <p className="text-gray-800">{formatDate(job.updated_at)}</p>
          </div>
        </div>

        {job.error_message && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <p className="text-sm font-medium text-red-700 mb-1">Erreur</p>
            <pre className="text-xs text-red-600 whitespace-pre-wrap">
              {job.error_message}
            </pre>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
          Pipeline ({job.pipeline.length} étape{job.pipeline.length > 1 ? "s" : ""})
        </h2>
        <div className="space-y-2">
          {job.pipeline.map((step, i) => (
            <div
              key={i}
              className="flex items-start gap-3 bg-gray-50 rounded-lg px-4 py-3"
            >
              <span className="text-xs text-gray-400 font-mono mt-0.5">
                #{i + 1}
              </span>
              <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono">
                {JSON.stringify(step, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      </div>

      {job.status === "done" && job.result !== null && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
            Résultat
          </h2>
          <ResultViewer result={job.result} />
        </div>
      )}
    </div>
  );
}
