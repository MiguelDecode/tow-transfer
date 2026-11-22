import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { Paginated, Transfer, TransferStatus } from "../lib/types";

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
