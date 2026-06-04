import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import client from "../api/client";
import type { Datasource } from "../types";

export function useDatasources() {
  return useQuery<Datasource[]>({
    queryKey: ["datasources"],
    queryFn: async () => {
      const { data } = await client.get("/datasources");
      return data;
    },
  });
}

export function useUploadDatasource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const { data } = await client.post<Datasource>("/datasources", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["datasources"] }),
  });
}

export function useDeleteDatasource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await client.delete(`/datasources/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["datasources"] }),
  });
}

export function useDatasourceColumns(id: string | undefined) {
  return useQuery<string[]>({
    queryKey: ["datasource-columns", id],
    queryFn: async () => {
      const { data } = await client.get(`/datasources/${id}/columns`);
      return data;
    },
    enabled: !!id,
  });
}
