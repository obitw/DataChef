import { useState, FormEvent } from "react";
import {
  useGroups,
  useCreateGroup,
  useJoinGroup,
  useGroupMembers,
} from "../hooks/useGroups";
import type { Group } from "../types";

function MembersPanel({ groupId }: { groupId: string }) {
  const { data: members, isLoading } = useGroupMembers(groupId);
  if (isLoading) return <p className="text-xs text-gray-400 mt-2">Chargement...</p>;
  return (
    <ul className="mt-2 space-y-1">
      {members?.map((m) => (
        <li key={m.id} className="text-sm text-gray-600">
          {m.email}
        </li>
      ))}
    </ul>
  );
}

function GroupCard({ group }: { group: Group }) {
  const joinGroup = useJoinGroup();
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-gray-900">{group.name}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            Créé le{" "}
            {new Date(group.created_at).toLocaleDateString("fr-FR", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => joinGroup.mutate(group.id)}
            disabled={joinGroup.isPending}
            className="btn-secondary text-sm"
          >
            Rejoindre
          </button>
          <button
            onClick={() => setOpen((v) => !v)}
            className="btn-secondary text-sm"
          >
            {open ? "Masquer" : "Membres"}
          </button>
        </div>
      </div>
      {open && <MembersPanel groupId={group.id} />}
    </div>
  );
}

export default function GroupsPage() {
  const { data: groups, isLoading } = useGroups();
  const createGroup = useCreateGroup();
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await createGroup.mutateAsync(name.trim());
      setName("");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Erreur lors de la création.";
      setError(String(msg));
    }
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Groupes</h1>
        <p className="text-sm text-gray-500 mt-1">
          Partagez des datasources avec vos collaborateurs.
        </p>
      </div>

      <form
        onSubmit={handleCreate}
        className="bg-white rounded-xl border border-gray-200 p-6 flex gap-3"
      >
        <input
          className="input flex-1"
          placeholder="Nom du groupe"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <button
          type="submit"
          disabled={!name.trim() || createGroup.isPending}
          className="btn-primary"
        >
          Créer
        </button>
        {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
      </form>

      <div className="space-y-3">
        {isLoading && (
          <p className="text-center text-gray-400">Chargement...</p>
        )}
        {!isLoading && !groups?.length && (
          <p className="text-center text-gray-400">Aucun groupe pour l'instant.</p>
        )}
        {groups?.map((g) => <GroupCard key={g.id} group={g} />)}
      </div>
    </div>
  );
}
