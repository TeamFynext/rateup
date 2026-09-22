import { keepPreviousData, queryOptions } from "@tanstack/react-query";

import { api } from "./client";
import type { IsoDate, Page } from "./types";

export const USER_STATUSES = ["active", "paused", "inactive"] as const;
export type UserStatusFilter = (typeof USER_STATUSES)[number];
export const USER_SORTS = ["created", "email", "lastLogin"] as const;
export type UserSort = (typeof USER_SORTS)[number];

export interface UserListParams {
  q?: string;
  status?: UserStatusFilter;
  sort?: UserSort;
  order?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface UserRow {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  active: boolean;
  paused: boolean;
  deletedAt: IsoDate | null;
  createdAt: IsoDate;
  lastLoginAt: IsoDate | null;
  orgCount: number;
  orgs: { id: string; name: string; isOwner: boolean }[];
}

export async function listUsers(params: UserListParams, signal?: AbortSignal) {
  const { data } = await api.get<Page<UserRow>>("/users", { params, signal });
  return data;
}

export const userListQueryOptions = (params: UserListParams) =>
  queryOptions({
    queryKey: ["staff", "users", "list", params],
    queryFn: ({ signal }) => listUsers(params, signal),
    placeholderData: keepPreviousData,
  });
