import { IconChevronRight } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import type { LoyaltyRewardType } from "@/backend/loyalty/reward.api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { cn } from "@/lib/utils.ts";

import { LOYALTY_PATHS } from "../paths.ts";
import { REWARD_KIND_ORDER, rewardKindMeta } from "./rewardKinds.ts";

/** Step one of "Create reward": which kind. Each choice is a link to where it is made. */
export function RewardTypePicker({
  open,
  onOpenChange,
  pointsName,
}: Readonly<{ open: boolean; onOpenChange: (open: boolean) => void; pointsName: string }>) {
  const { t } = useTranslation();
  const kinds = rewardKindMeta(t, pointsName);

  const target = (type: LoyaltyRewardType, children: ReactNode, className: string) =>
    type === "review" ? (
      <Link to={LOYALTY_PATHS.feedback} search={{ tab: "settings", page: 1 }} className={className}>
        {children}
      </Link>
    ) : (
      <Link to={LOYALTY_PATHS.rewardNew} search={{ type }} className={className}>
        {children}
      </Link>
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("Create a reward")}</DialogTitle>
          <DialogDescription>{t("What kind of reward is it?")}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          {REWARD_KIND_ORDER.map((type) => {
            const meta = kinds[type];
            const Icon = meta.icon;
            return (
              <div key={type}>
                {target(
                  type,
                  <>
                    <span
                      className={cn(
                        "flex size-10 shrink-0 items-center justify-center rounded-lg",
                        meta.toneClass,
                      )}
                      aria-hidden="true"
                    >
                      <Icon size={20} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{meta.label}</span>
                      <span className="block text-xs text-muted-foreground">
                        {type === "review"
                          ? `${meta.blurb} ${t("Set up under Feedback.")}`
                          : meta.blurb}
                      </span>
                    </span>
                    <IconChevronRight
                      size={16}
                      className="shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                  </>,
                  "flex items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                )}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
