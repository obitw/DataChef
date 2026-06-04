import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import client from "../api/client";
import type { Job, PipelineStep } from "../types";

export function useJobs() {
  return useQuery<Job[]>({
    queryKey: ["jobs"],
    queryFn: async () => {
      const { data } = await client.get("/jobs");
      return data;
    },
    refetchInterval: (query) => {
      const jobs = query.state.data;
      if (!jobs) return false;
      const hasActive = jobs.some(
        (j) => j.status === "pending" || j.status === "running"
      );
      return hasActive ? 3000 : false;
    },
  });
}

export function useJob(id: string) {
  return useQuery<Job>({
    queryKey: ["jobs", id],
    queryFn: async () => {
      const { data } = await client.get(`/jobs/${id}`);
      return data;
    },
    refetchInterval: (query) => {
      const job = query.state.data;
      if (!job) return false;
      return job.status === "pending" || job.status === "running" ? 3000 : false;
    },
  });
}

export function useCreateJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      name: string;
      datasource_id: string;
      pipeline: PipelineStep[];
    }) => {
      const { data } = await client.post<Job>("/jobs", payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["jobs"] }),
  });
}
