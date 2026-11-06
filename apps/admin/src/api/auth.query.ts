import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

import { getMe, logout } from "./auth.api";

export const meQueryOptions = queryOptions({
  queryKey: ["staff", "me"],
  queryFn: getMe,
  staleTime: 5 * 60_000,
  retry: false,
});

/** The signed-in staff user. Only call below the `_app` layout, which guarantees it is loaded. */
export function useStaff() {
  const { data } = useQuery(meQueryOptions);
  if (!data) throw new Error("useStaff() used outside the authenticated layout");
  return data;
}

export function useLogout() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: logout,
    onSettled: () => {
      // Drop everything, not just `me`: no staff data should outlive the session in memory.
      queryClient.clear();
      void navigate({ to: "/login", replace: true });
    },
  });
}
