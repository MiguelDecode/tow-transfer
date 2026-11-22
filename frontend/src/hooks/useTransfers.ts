import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "../lib/api";
import type {
  CreateTransferBody,
  Paginated,
  Transfer,
  TransferDetail,
  TransferStatus,
} from "../lib/types";

export type TransferFilters = {
  status?: TransferStatus;
  q?: string;
  page: number;
  pageSize: number;
};

export function useTransfers(filters: TransferFilters) {
  return useQuery({
    queryKey: ["transfers", filters],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(filters.page),
        pageSize: String(filters.pageSize),
      });
      if (filters.status) params.set("status", filters.status);
      if (filters.q) params.set("q", filters.q);
      return api<Paginated<Transfer>>(`/transfers?${params.toString()}`);
    },
    placeholderData: keepPreviousData,
  });
}

export function useCreateTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateTransferBody) =>
      api<Transfer>("/transfers", { method: "POST", body }),
    onSuccess: () => {
      // The lists are out of date now: they will be requested again.
      void queryClient.invalidateQueries({ queryKey: ["transfers"] });
    },
  });
}

export function useTransfer(id: number) {
  return useQuery({
    queryKey: ["transfers", "detail", id],
    queryFn: () => api<TransferDetail>(`/transfers/${id}`),
    enabled: Number.isInteger(id) && id > 0,
  });
}

export function useUpdateTransfer(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateTransferBody) =>
      api<Transfer>(`/transfers/${id}`, { method: "PATCH", body }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["transfers"] });
    },
  });
}

type TransferAction = "release" | "start" | "deliver" | "cancel";

export function useTransferAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: number; action: TransferAction }) =>
      api<Transfer>(`/transfers/${id}/${action}`, { method: "POST" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["transfers"] });
    },
  });
}
