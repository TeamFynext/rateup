import { createFileRoute } from "@tanstack/react-router";

import { AuditLogPage } from "@/components/dashboard/settings/audit-log/AuditLogPage.tsx";

export const Route = createFileRoute("/dashboard/settings/audit-log/")({
  component: AuditLogPage,
});
