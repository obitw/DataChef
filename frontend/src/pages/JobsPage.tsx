import { useState, FormEvent } from "react";
import { Link } from "react-router-dom";
import { useJobs, useCreateJob } from "../hooks/useJobs";
import { useDatasources, useDatasourceColumns } from "../hooks/useDatasources";
import PipelineBuilder from "../components/PipelineBuilder";
import type { Job, PipelineStep } from "../types";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  running: "bg-blue-100 text-blue-700",
  done: "bg-green-100 text-green-700",
  error: "bg-red-100 text-red-700",
};

function JobRow({ job }: { job: Job }) {
  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3 font-medium text-gray-900">
        <Link to={`/jobs/${job.id}`} className="hover:text-indigo-600">
          {job.name}
        </Link>
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
            STATUS_STYLES[job.status]
          }`}
        >
          {(job.status === "pending" || job.status === "running") && (
            <span className="animate-pulse">●</span>
          )}
          {job.status}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-gray-500">
        {job.pipeline.length} étape{job.pipeline.length > 1 ? "s" : ""}
      </td>
      <td className="px-4 py-3 text-sm text-gray-500">
        {new Date(job.created_at).toLocaleString("fr-FR", {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </td>
      <td className="px-4 py-3 text-right">
        <Link
          to={`/jobs/${job.id}`}
          className="text-sm text-indigo-600 hover:underline"
        >
          Détail →
        </Link>
      </td>
    </tr>
  );
}

function NewJobModal({ onClose }: { onClose: () => void }) {
  const { data: datasources } = useDatasources();
  const createJob = useCreateJob();
  const [jobName, setJobName] = useState("");
  const [datasourceId, setDatasourceId] = useState("");
  const [steps, setSteps] = useState<PipelineStep[]>([]);
  const [error, setError] = useState("");
  const { data: columns } = useDatasourceColumns(datasourceId || undefined);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!datasourceId) return setError("Sélectionnez une datasource.");
    if (!steps.length) return setError("Ajoutez au moins une étape.");
    try {
      await createJob.mutateAsync({
        name: jobName.trim() || "Job sans titre",
        datasource_id: datasourceId,
        pipeline: steps,
      });
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Erreur lors de la création du job.";
      setError(String(msg));
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Nouveau job</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Nom du job</label>
              <input
                className="input"
                placeholder="mon-analyse"
                value={jobName}
                onChange={(e) => setJobName(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Datasource</label>
              <select
                className="input"
                value={datasourceId}
                onChange={(e) => setDatasourceId(e.target.value)}
                required
              >
                <option value="">— Choisir —</option>
                {datasources?.map((ds) => (
                  <option key={ds.id} value={ds.id}>
                    {ds.name} ({ds.format})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label mb-2 block">Pipeline</label>
            <PipelineBuilder steps={steps} onChange={setSteps} columns={columns ?? []} />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Annuler
            </button>
            <button
              type="submit"
              disabled={createJob.isPending}
              className="btn-primary"
            >
              {createJob.isPending ? "Envoi..." : "Créer le job"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function JobsPage() {
  const { data: jobs, isLoading } = useJobs();
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Jobs</h1>
          <p className="text-sm text-gray-500 mt-1">
            Suivi en temps réel de vos traitements de données.
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          + Nouveau job
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <p className="px-6 py-8 text-center text-gray-400">Chargement...</p>
        ) : !jobs?.length ? (
          <p className="px-6 py-8 text-center text-gray-400">
            Aucun job pour l'instant.
          </p>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["Nom", "Statut", "Pipeline", "Créé le", ""].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[...jobs].reverse().map((job) => (
                <JobRow key={job.id} job={job} />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && <NewJobModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
