import { useTranslation } from "react-i18next";

import { BackLink } from "@/components/common/back-link.tsx";
import { RoleBadge } from "@/components/common/RoleBadge.tsx";
import { Card } from "@/components/ui/card.tsx";
import { cn } from "@/lib/utils.ts";
import { PERMISSION_GROUPS, PERMISSION_LABELS } from "@/utils/authz/permissions.ts";
import { ROLE_META, ROLE_PERMISSIONS } from "@/utils/authz/roles.ts";

import { grantsAt, ROLE_LADDER } from "./roleDiff.ts";

/**
 * The roles as a ladder: each column includes everything to its left. A permission is
 * marked in full on the step that grants it and faintly on every step above, so the eye
 * reads *where* an ability enters rather than a wall of identical ticks.
 */
export function RolesMatrixPage() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto flex w-full max-w-265 flex-col gap-4">
      <div>
        <BackLink to="/dashboard/settings/members" label={t("Members")} className="mb-2" />
        <h2 className="mb-1 text-2xl">{t("Roles")}</h2>
        <p className="max-w-2xl text-sm text-muted-foreground">
          {t(
            "From Agent upward, each role includes everything the one before it can do; Viewer is the read-only slice of Staff. A role decides what someone may do; their teams decide where.",
          )}
        </p>
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[56rem] border-separate border-spacing-0 text-sm">
          <thead className="sticky top-0 z-10 bg-card">
            <tr>
              <th
                scope="col"
                className="w-72 border-b border-border px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
              >
                {t("Ability")}
              </th>
              {ROLE_LADDER.map((key) => (
                <th
                  key={key}
                  scope="col"
                  className="border-b border-border px-3 py-3 text-center align-top"
                >
                  <div className="flex flex-col items-center gap-1">
                    <RoleBadge roleKey={key} size="sm" />
                    <span className="text-[11px] font-normal text-muted-foreground">
                      {ROLE_META[key].teamScope === "ALL" ? t("Every team") : t("Their teams")}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSION_GROUPS.map((group) => (
              <>
                <tr key={`${group.key}-head`}>
                  <th
                    scope="rowgroup"
                    colSpan={ROLE_LADDER.length + 1}
                    className="bg-muted/40 px-4 py-1.5 text-left text-xs font-medium text-foreground"
                  >
                    {t(group.label)}
                  </th>
                </tr>
                {group.permissions
                  .filter((permission) => !permission.startsWith("notify."))
                  .map((permission) => {
                    return (
                      <tr key={permission} className="hover:bg-muted/30">
                        <th
                          scope="row"
                          className="border-b border-border px-4 py-2 text-left font-normal text-foreground"
                        >
                          {t(PERMISSION_LABELS[permission])}
                        </th>
                        {ROLE_LADDER.map((key) => {
                          const has = ROLE_PERMISSIONS[key].has(permission);
                          const grants = grantsAt(permission, key);
                          return (
                            <td key={key} className="border-b border-border px-3 py-2 text-center">
                              {has ? (
                                <span
                                  aria-label={grants ? t("Granted here") : t("Included")}
                                  className={cn(
                                    "inline-block size-2.5 rounded-full",
                                    grants ? "bg-primary" : "bg-primary/25",
                                  )}
                                />
                              ) : (
                                <span
                                  aria-label={t("Not included")}
                                  className="inline-block size-2.5 rounded-full border border-border"
                                />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
              </>
            ))}
          </tbody>
        </table>
      </Card>

      <p className="text-xs text-muted-foreground">
        {t(
          "A filled dot is where the ability enters the ladder; a faint dot means the role inherits it.",
        )}
      </p>
    </div>
  );
}
