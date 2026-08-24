import { IconSettings } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { AdminDashboard } from "@/components/admin/dashboard/AdminDashboard.tsx";

export function AdminPage() {
  const { t: translations } = useTranslation();

  return (
    <div className="container mx-auto space-y-8">
      {/* Header Section */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <IconSettings className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-semibold tracking-tight">
              {translations("Admin Dashboard")}
            </h1>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Manage your platform settings, users, and integrations from a centralized dashboard
        </p>
      </div>

      {/* The figures come first: the navigation below is always available, but what the
          business is doing is the reason to open this page. */}
      <AdminDashboard />
    </div>
  );
}
