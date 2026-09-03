import { IconSparkles } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button.tsx";
import type { AccessDenialReason } from "@/utils/apiError.ts";

/**
 * Shown when the org's plan does not include the feature behind this page.
 *
 * Deliberately not `UnauthorizedPage`: that one says "you don't have permission,
 * contact your super admin", which is the wrong advice and a dead end for someone on
 * the Free plan — they are the super admin, and the fix is a plan change, not a
 * permission change. The API distinguishes the two (see `AccessDenialReason`); this is
 * the half that ends in the billing page rather than in a conversation with an admin.
 */
export function PlanUpgradeRequired({
  feature,
  reason = "subscription",
}: Readonly<{
  /** What the customer was trying to reach, e.g. "Campaigns". Named in the heading. */
  feature?: string;
  reason?: AccessDenialReason;
}>) {
  const navigate = useNavigate();
  const { t: translations } = useTranslation();

  const expired = reason === "subscription_expired";

  const heading = expired
    ? translations("Your subscription has ended")
    : feature
      ? translations("{feature} is not part of your plan", { feature })
      : translations("This feature is not part of your plan");

  const body = expired
    ? translations(
        "Renew your plan to pick up where you left off. Your data is exactly where you left it.",
      )
    : translations(
        "Upgrade to unlock it. Nothing you have already set up changes, and you keep everything on your current plan.",
      );

  return (
    <div className="flex flex-col items-center justify-center gap-6 pt-[200px]">
      <div className="flex items-center gap-2">
        <IconSparkles size={32} stroke={2} className="text-ru-amber-500" />
        <h3 className="text-2xl font-semibold text-foreground">{heading}</h3>
      </div>
      <p className="max-w-2xl text-center text-lg text-muted-foreground">{body}</p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button size="default" onClick={() => navigate({ to: "/dashboard/settings/billing" })}>
          {expired ? translations("Renew your plan") : translations("See plans")}
        </Button>
        <Button size="default" variant="ghost" onClick={() => navigate({ to: "/dashboard" })}>
          {translations("Go back to home page")}
        </Button>
      </div>
    </div>
  );
}

export default PlanUpgradeRequired;
