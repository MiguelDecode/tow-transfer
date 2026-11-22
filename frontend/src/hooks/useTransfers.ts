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
