import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, api } from "../lib/api";
import type { AuthUser } from "../lib/types";

type Credentials = { email: string; password: string };

// The current user, or null when there is no session.
export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      try {
        return await api<AuthUser>("/auth/me");
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null;
        throw error;
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (credentials: Credentials) =>
      api<AuthUser>("/auth/login", { method: "POST", body: credentials }),
    onSuccess: (user) => {
      queryClient.setQueryData(["me"], user);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api<void>("/auth/logout", { method: "POST" }),
    onSuccess: () => {
      // First mark the session as closed, so the app redirects to the login...
      queryClient.setQueryData(["me"], null);
      // ...and then drop the previous user's data from the cache.
      queryClient.removeQueries({
        predicate: (query) => query.queryKey[0] !== "me",
      });
    },
  });
}
