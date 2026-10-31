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
              {translations("RateUp Admin")}
            </h1>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          RateUp's internal console for running the platform across every customer organization
        </p>
      </div>

      {/* The figures come first: the navigation below is always available, but what the
          business is doing is the reason to open this page. */}
      <AdminDashboard />
    </div>
  );
}
