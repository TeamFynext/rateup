import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { useUpdateOrgModules } from "@/backend/org/org.query.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty.tsx";
import { useOrgModules } from "@/hooks/useOrgModules.ts";
import { usePermissions } from "@/hooks/usePermission.ts";
import { moduleLabel, type OrgModuleInfo } from "@/utils/modules.ts";

/** Shown in place of a page whose feature the org has hidden. Turning it on renders the page. */
export function ModuleOff({ module }: Readonly<{ module: OrgModuleInfo }>) {
  const { t } = useTranslation();
  const { can } = usePermissions();
  const { hiddenModules } = useOrgModules();
  const update = useUpdateOrgModules();
  const Icon = module.icon;
  const label = moduleLabel(t, module.key);

  return (
    <Empty className="pt-24">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon />
        </EmptyMedia>
        <EmptyTitle>{t("{feature} is turned off", { feature: label })}</EmptyTitle>
        <EmptyDescription>
          {can("org.settings")
            ? t("Turn it on to add it back to the menu for everyone in your organization.")
            : t("Ask an admin to turn on {feature} from Customize Menu.", { feature: label })}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent className="flex-row justify-center">
        {can("org.settings") && (
          <Button
            loading={update.isPending}
            onClick={() => update.mutate([...hiddenModules].filter((key) => key !== module.key))}
          >
            {t("Turn on {feature}", { feature: label })}
          </Button>
        )}
        <Button variant="ghost" render={<Link to="/dashboard" />}>
          {t("Go back to home page")}
        </Button>
      </EmptyContent>
    </Empty>
  );
}
