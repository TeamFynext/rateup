"use client";

import { createFileRoute } from "@tanstack/react-router";

import { AuditLogs } from "@/components/dashboard/analytics/audit-log/AuditLogs.tsx";

export const Route = createFileRoute("/dashboard/analytics/audit-log/")({
  component: AuditLogs,
});
