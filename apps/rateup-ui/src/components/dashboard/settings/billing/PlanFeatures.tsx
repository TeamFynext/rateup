import { IconCircleCheck, IconSparkles } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { isUnlimitedCount } from "@/components/HomePage/pages/Pricing/pricing.data.ts";
import type { PricingPlan } from "@/components/HomePage/pages/Pricing/types.ts";
import { Card } from "@/components/ui/card.tsx";

/**
 * What the current plan actually includes.
 *
 * The bullets come from the plan catalog (`RateupPlan.description`) rather than being
 * derived from the stored `features` blob: the catalog is the same copy the pricing page
 * sells, so the customer sees the list they bought. Orgs on a custom or legacy plan have
 * no catalog row, and fall back to a summary read off their own entitlements.
 *
 * The other fallback is an Enterprise account contracted to a ceiling. Enterprise is
 * unlimited by default and its card copy says so, but a deal can cap an individual
 * account, and the send gate enforces that cap. Showing the tier's "Unlimited" line to a
 * customer whose messages stop at 200,000 would be telling them the opposite of what the
 * product does, so their own numbers are shown instead.
 */
export function PlanFeatures({
  plan,
  subscription,
}: {
  plan: PricingPlan | undefined;
  subscription?: Subscription;
}) {
  const { t: translations } = useTranslation();

  const catalogBullets = plan?.description ?? [];
  const bullets =
    catalogBullets.length && !overstatesAllowance(catalogBullets, subscription)
      ? catalogBullets
      : derivedBullets(subscription);

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

/**
 * Whether the catalog copy promises "unlimited" something the org is in fact capped on.
 *
 * Only a contracted Enterprise account can be in this state: every other tier stores real
 * numbers and sells copy that quotes them.
 */
function overstatesAllowance(bullets: string[], subscription?: Subscription): boolean {
  if (!bullets.some((bullet) => /unlimited/i.test(bullet))) return false;

  const features = subscription?.features;
  const caps = [
    features?.whatsapp?.conversation?.count?.max,
    features?.webSurvey?.count?.monthlyResponseLimit,
    features?.team?.count?.max,
    features?.team?.teamMember?.count?.max,
  ];

  return caps.some((max) => typeof max === "number" && max > 0 && !isUnlimitedCount(max));
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

  // A count at the sentinel is not a number to print: 10,000,000 teams reads as a bug.
  const count = (value: number | undefined) =>
    isUnlimitedCount(value) ? "Unlimited" : value?.toLocaleString();

  if (teams) bullets.push(`${count(teams)} teams`);
  if (members) bullets.push(`${count(members)} users`);
  if (conversations) bullets.push(`${count(conversations)} conversations / mo`);
  if (responses) bullets.push(`${count(responses)} form submissions / mo`);
  if (features.whatsapp?.campaign?.active) bullets.push("Campaigns");
  if (features.loyalty?.active) bullets.push("Loyalty & referrals");
  if (features.ai?.active) bullets.push("AI assistant");

  return bullets;
}
