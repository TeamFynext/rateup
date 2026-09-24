import { keepPreviousData, queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "./client";
import type { IsoDate, Page } from "./types";

export interface StaffMember {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  active: boolean;
  isOwner: boolean;
  linkedToGoogle: boolean;
  createdAt: IsoDate;
  addedBy: string | null;
  lastLoginAt: IsoDate | null;
  deactivatedAt: IsoDate | null;
  openSessions: number;
}

export interface AuditEntry {
  id: string;
  staffUserId: string | null;
  staffEmail: string;
  action: string;
  method: string;
  route: string;
  targetOrgId: string | null;
  targetOrgName: string | null;
  targetUserId: string | null;
  reason: string | null;
  before: unknown;
  after: unknown;
  body: unknown;
  ip: string | null;
  userAgent: string | null;
  createdAt: IsoDate;
}

export interface AuditParams {
  q?: string;
  action?: string;
  staffUserId?: string;
  orgId?: string;
  page?: number;
  pageSize?: number;
}

export const staffMembersQueryOptions = queryOptions({
  queryKey: ["staff", "access", "members"],
  queryFn: async () => (await api.get<{ data: StaffMember[] }>("/staff-users")).data.data,
});

export const auditQueryOptions = (params: AuditParams) =>
  queryOptions({
    queryKey: ["staff", "access", "audit", params],
    queryFn: async ({ signal }) =>
      (await api.get<Page<AuditEntry>>("/audit", { params, signal })).data,
    placeholderData: keepPreviousData,
  });

export const auditActionsQueryOptions = queryOptions({
  queryKey: ["staff", "access", "audit-actions"],
  queryFn: async () =>
    (await api.get<{ data: { action: string; count: number }[] }>("/audit/actions")).data.data,
});

/**
 * Owner-only changes to who can sign in. Each refreshes the member list and the audit log,
 * which every one of them writes to.
 */
function useAccessMutation<TInput, TResult = unknown>(send: (input: TInput) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: send,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["staff", "access"] }),
  });
}

export const useAddStaff = () =>
  useAccessMutation((input: { email: string; name?: string; isOwner: boolean; reason: string }) =>
    api.post("/staff-users", input),
  );

export const useChangeStaffRole = () =>
  useAccessMutation(({ id, ...input }: { id: string; isOwner: boolean; reason: string }) =>
    api.patch(`/staff-users/${id}`, input),
  );

export const useDeactivateStaff = () =>
  useAccessMutation(({ id, reason }: { id: string; reason: string }) =>
    api.post(`/staff-users/${id}/deactivate`, { reason }),
  );

export const useRevokeStaffSessions = () =>
  useAccessMutation(async ({ id, reason }: { id: string; reason: string }) => {
    const { data } = await api.post<{ data: { sessionsEnded: number } }>(
      `/staff-users/${id}/revoke-sessions`,
      { reason },
    );
    return data.data;
  });
