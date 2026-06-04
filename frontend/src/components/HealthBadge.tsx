import { useQuery } from "@tanstack/react-query";
import client from "../api/client";
import type { HealthStatus } from "../types";

export default function HealthBadge() {
  const { data } = useQuery<HealthStatus>({
    queryKey: ["health"],
    queryFn: async () => {
      const { data } = await client.get("/health");
      return data;
    },
    refetchInterval: 30000,
  });

  const color = !data
    ? "bg-gray-400"
    : data.status === "ok"
      ? "bg-green-500"
      : "bg-red-500";

  const label = !data ? "..." : data.status === "ok" ? "Système OK" : "Dégradé";

  return (
    <div className="flex items-center gap-2 text-sm text-gray-600">
      <span className={`inline-block w-2.5 h-2.5 rounded-full ${color}`} />
      <span>{label}</span>
    </div>
  );
}
