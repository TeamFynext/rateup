import { IconLogout } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { useLoyaltyProgram } from "@/backend/loyalty/program.query";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { useUser } from "@/context/UserContext.tsx";

/**
 * The staff-device variant: no sidebar, no dashboard, no settings — nothing to break. A
 * tablet or phone at the counter stays signed in until someone signs out.
 */
export function StandaloneShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const { t } = useTranslation();
  const { user } = useUser();
  const { data: program } = useLoyaltyProgram();
  const live = program?.status === "active";

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-background/95 px-4 py-2.5 backdrop-blur">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-semibold text-foreground">
            {program?.name ?? t("Loyalty")}
          </span>
          {program && (
            <Badge
              variant="secondary"
              className={
                live
                  ? "bg-green-600/10 text-green-700 dark:text-green-500"
                  : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-500"
              }
            >
              {live ? t("{points} live", { points: program.currencyName }) : t("Paused")}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {user?.userName && (
            <span className="hidden text-xs text-muted-foreground sm:inline">{user.userName}</span>
          )}
          <Button variant="ghost" size="sm" render={<Link to="/logout" />}>
            <IconLogout size={16} />
            {t("Sign out")}
          </Button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 p-4 sm:p-6">{children}</main>
      <footer className="px-4 py-3 text-center text-xs text-muted-foreground">
        {t("Signed in to this device until someone signs out.")}
      </footer>
    </div>
  );
}
