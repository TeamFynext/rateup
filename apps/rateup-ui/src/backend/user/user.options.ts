import { queryOptions } from "@tanstack/react-query";

import { fetchUserInfo, fetchUserProfile, getAllUsers } from "./user.api";
import { userKeys } from "./user.keys";

/**
 * Shared query definitions for the user domain.
 *
 * These live apart from `user.query.tsx` on purpose: route loaders need the key + fetcher
 * pair, but not the hooks, and `user.query.tsx` pulls in `sonner` and the router. Importing
 * that module from a loader would drag all of it into the route's module scope — which in
 * this app lands in the client entry rather than the route's split chunk.
 */
export const userInfoQuery = () =>
  queryOptions({
    queryKey: userKeys.info(),
    queryFn: fetchUserInfo,
    staleTime: 60 * 1000,
  });

export const userProfileQuery = () =>
  queryOptions({
    queryKey: userKeys.profile(),
    queryFn: () => fetchUserProfile(),
  });

export const allUsersQuery = () =>
  queryOptions({
    queryKey: userKeys.all(),
    queryFn: getAllUsers,
  });
