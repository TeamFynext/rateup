import { IconCircleCheck, IconSparkles } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import type { PricingPlan } from "@/components/HomePage/pages/Pricing/types.ts";
import { Card } from "@/components/ui/card.tsx";

/**
 * What the current plan actually includes.
 *
 * The bullets come from the plan catalog (`RateupPlan.description`) rather than being
 * derived from the stored `features` blob: the catalog is the same copy the pricing page
 * sells, so the customer sees the list they bought. Orgs on a custom or legacy plan have
 * no catalog row, and fall back to a summary read off their own entitlements.
 */
export function PlanFeatures({
  plan,
  subscription,
}: {
  plan: PricingPlan | undefined;
  subscription?: Subscription;
}) {
  const { t: translations } = useTranslation();

  const bullets = plan?.description?.length ? plan.description : derivedBullets(subscription);

  return (
    <Card className="p-6 gap-3">
      <h3 className="flex items-center gap-2">
        <IconSparkles className="h-4 w-4" />
        {translations("What's included")}
      </h3>

      {bullets.length ? (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {bullets.map((bullet) => (
            <li key={bullet} className="flex items-start gap-2 text-sm">
              <IconCircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          {translations("Feature details are not available for this plan.")}
        </p>
      )}
    </Card>
  );
}

/** Fallback for custom/legacy plans: describe the limits the org is actually running on. */
function derivedBullets(subscription?: Subscription): string[] {
  const features = subscription?.features;
  if (!features) return [];

  const bullets: string[] = [];
  const teams = features.team?.count?.max;
  const members = features.team?.teamMember?.count?.max;
  const conversations = features.whatsapp?.conversation?.count?.max;
  const responses = features.webSurvey?.count?.monthlyResponseLimit;

  if (teams) bullets.push(`${teams.toLocaleString()} teams`);
  if (members) bullets.push(`${members.toLocaleString()} users`);
  if (conversations) bullets.push(`${conversations.toLocaleString()} conversations / mo`);
  if (responses) bullets.push(`${responses.toLocaleString()} form submissions / mo`);
  if (features.whatsapp?.campaign?.active) bullets.push("Campaigns");
  if (features.loyalty?.active) bullets.push("Loyalty & referrals");
  if (features.ai?.active) bullets.push("AI assistant");

  return bullets;
}
