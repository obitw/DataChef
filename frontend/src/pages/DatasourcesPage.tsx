import { useState, FormEvent } from "react";
import {
  useDatasources,
  useUploadDatasource,
  useDeleteDatasource,
} from "../hooks/useDatasources";
import { useGroups } from "../hooks/useGroups";
import FileDropzone from "../components/FileDropzone";
import type { Datasource } from "../types";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function DatasourceRow({
  ds,
  onDelete,
}: {
  ds: Datasource;
  onDelete: (id: string) => void;
}) {
  const [confirm, setConfirm] = useState(false);

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3 font-medium text-gray-900">{ds.name}</td>
      <td className="px-4 py-3">
        <span className="uppercase text-xs font-mono bg-gray-100 px-2 py-0.5 rounded">
          {ds.format}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-gray-500">
        {ds.group_id ? "Partagée" : "Privée"}
      </td>
      <td className="px-4 py-3 text-sm text-gray-500">{formatDate(ds.created_at)}</td>
      <td className="px-4 py-3 text-right">
        {confirm ? (
          <span className="flex items-center justify-end gap-2">
            <button
              onClick={() => onDelete(ds.id)}
              className="text-sm text-red-600 hover:underline"
            >
              Confirmer
            </button>
            <button
              onClick={() => setConfirm(false)}
              className="text-sm text-gray-500 hover:underline"
            >
              Annuler
            </button>
          </span>
        ) : (
          <button
            onClick={() => setConfirm(true)}
            className="text-sm text-gray-400 hover:text-red-500"
          >
            Supprimer
          </button>
        )}
      </td>
    </tr>
  );
}

export default function DatasourcesPage() {
  const { data: datasources, isLoading } = useDatasources();
  const { data: groups } = useGroups();
  const upload = useUploadDatasource();
  const deleteDatasource = useDeleteDatasource();

  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [groupId, setGroupId] = useState("");
  const [uploadError, setUploadError] = useState("");

  async function handleUpload(e: FormEvent) {
    e.preventDefault();
    if (!file) return;
    setUploadError("");
    const fd = new FormData();
    fd.append("file", file);
    if (name.trim()) fd.append("name", name.trim());
    if (groupId) fd.append("group_id", groupId);
    try {
      await upload.mutateAsync(fd);
      setFile(null);
      setName("");
      setGroupId("");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Erreur lors de l'upload.";
      setUploadError(String(msg));
    }
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Datasources</h1>
        <p className="text-sm text-gray-500 mt-1">
          Importez vos fichiers CSV ou JSON pour créer des datasources.
        </p>
      </div>

      <form
        onSubmit={handleUpload}
        className="bg-white rounded-xl border border-gray-200 p-6 space-y-4"
      >
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          Nouveau fichier
        </h2>
        <FileDropzone onFile={setFile} />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Nom (optionnel)</label>
            <input
              className="input"
              placeholder="nom-du-fichier"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Groupe (optionnel)</label>
            <select
              className="input"
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
            >
              <option value="">— Privé —</option>
              {groups?.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        {uploadError && <p className="text-sm text-red-600">{uploadError}</p>}
        <button
          type="submit"
          disabled={!file || upload.isPending}
          className="btn-primary"
        >
          {upload.isPending ? "Import en cours..." : "Importer"}
        </button>
      </form>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <p className="px-6 py-8 text-center text-gray-400">Chargement...</p>
        ) : !datasources?.length ? (
          <p className="px-6 py-8 text-center text-gray-400">
            Aucune datasource pour l'instant.
          </p>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["Nom", "Format", "Visibilité", "Date", ""].map((h) => (
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
              {datasources.map((ds) => (
                <DatasourceRow
                  key={ds.id}
                  ds={ds}
                  onDelete={(id) => deleteDatasource.mutate(id)}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
