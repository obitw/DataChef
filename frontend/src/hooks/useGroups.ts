import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import client from "../api/client";
import type { Group, Member } from "../types";

export function useGroups() {
  return useQuery<Group[]>({
    queryKey: ["groups"],
    queryFn: async () => {
      const { data } = await client.get("/groups/");
      return data;
    },
  });
}

export function useGroupMembers(groupId: string) {
  return useQuery<Member[]>({
    queryKey: ["groups", groupId, "members"],
    queryFn: async () => {
      const { data } = await client.get(`/groups/${groupId}/members`);
      return data;
    },
  });
}

export function useCreateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const { data } = await client.post<Group>("/groups/", { name });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["groups"] }),
  });
}

export function useJoinGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (groupId: string) => {
      await client.post(`/groups/${groupId}/join`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["groups"] }),
  });
}
