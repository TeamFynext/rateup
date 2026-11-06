import { buttonVariants } from "@rateup/ui/components/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@rateup/ui/components/tooltip";
import { IconLayoutGrid } from "@tabler/icons-react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils.ts";

import { railButtonClass } from "./rail-styles.ts";

export const FEATURES_PATH = "/dashboard/customize-menu";

/** The rail's way into the feature catalogue, open to every member. */
export default function FeaturesButton() {
  const { t } = useTranslation();
  const active = useRouterState({ select: (s) => s.location.pathname.startsWith(FEATURES_PATH) });

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Link
            to={FEATURES_PATH}
            aria-label={t("Customize Menu")}
            aria-current={active ? "page" : undefined}
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon-sm" }),
              railButtonClass,
              active && "bg-sidebar-accent text-sidebar-accent-foreground",
            )}
          />
        }
      >
        <IconLayoutGrid className="size-5" strokeWidth={1.8} />
      </TooltipTrigger>
      <TooltipContent side="right">{t("Customize Menu")}</TooltipContent>
    </Tooltip>
  );
}
