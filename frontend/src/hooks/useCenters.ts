import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { Center } from "../lib/types";

export function useCenters() {
  return useQuery({
    queryKey: ["centers"],
    queryFn: () => api<Center[]>("/centers"),
    staleTime: 5 * 60 * 1000,
  });
}
