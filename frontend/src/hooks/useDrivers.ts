import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { DriverOption } from "../lib/types";

// Only managers and admins can ask for the list of drivers.
export function useDrivers(enabled: boolean) {
  return useQuery({
    queryKey: ["drivers"],
    queryFn: () => api<DriverOption[]>("/drivers"),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}
