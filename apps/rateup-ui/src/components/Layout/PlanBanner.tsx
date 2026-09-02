import { IconAlertTriangle, IconArrowUpRight, IconSparkles, IconX } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button.tsx";
import { usePlanStatus } from "@/hooks/usePlanStatus";

/**
 * Remembers a dismissal so an upsell does not reappear on every navigation. Scoped per
 * message kind: dismissing the free-plan nudge must not also silence a later "you have
 * run out of conversations", which is not an upsell but an outage the customer needs to
 * know about.
 */
const DISMISS_KEY = "rateup:plan-banner-dismissed";

function readDismissed(): string[] {
  try {
    const raw = globalThis.localStorage?.getItem(DISMISS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export type PlanBannerKind = "limit" | "free" | "paid";

/**
 * What the banner says, and what its button offers.
 *
 * Add-ons attach to a paid subscription, so they are never offered to a free org — not
 * in the standing nudge and not when it runs out of an allowance. Upgrading is the only
 * remedy a free plan has, and naming one it cannot use would send it down a dead end.
 *
 * Pure and exported so the branching can be tested without rendering; `translate` is the
 * caller's i18n function.
 */
export function planBannerCopy(
  kind: PlanBannerKind,
  isFreePlan: boolean,
  labels: string,
  translate: (key: string) => string,
): { message: string; cta: string } {
  if (kind === "limit") {
    const spent = `${translate("You have used all your")} ${labels} ${translate("for this billing period.")}`;
    return isFreePlan
      ? { message: `${spent} ${translate("Upgrade to keep going.")}`, cta: translate("Upgrade") }
      : {
          message: `${spent} ${translate("Upgrade or add an add-on to keep going.")}`,
          cta: translate("View plans"),
        };
  }

  if (kind === "free") {
    return {
      message: translate("You are on the Free plan. Upgrade for higher limits and more features."),
      cta: translate("Upgrade"),
    };
  }

  // Only reached when something is genuinely close to running out — see `nearlySpent`.
  // Naming the allowance is what makes this actionable rather than a standing advert.
  return {
    message: `${translate("You are running low on")} ${labels}. ${translate("Add an add-on or move up a plan for higher limits.")}`,
    cta: translate("View plans"),
  };
}

/**
 * The one persistent line about the org's plan, above every dashboard page.
 *
 * Exactly one message shows, by priority: an exhausted allowance first (it explains why
 * something stopped working), then the Free-plan nudge, then the add-on/upgrade prompt for
 * paying customers. Only the limit message is undismissable — the two upsells stay hidden
 * once closed.
 */
export function PlanBanner() {
  const { t: translations } = useTranslation();
  const { isLoading, isFreePlan, exhausted, nearlySpent } = usePlanStatus();
  const [dismissed, setDismissed] = useState<string[]>(readDismissed);

  if (isLoading) return null;

  const kind: PlanBannerKind = exhausted.length > 0 ? "limit" : isFreePlan ? "free" : "paid";
  // A paying customer with room to spare has nothing to act on. Telling them they are
  // "running short" at 2 of 100,000 is an advert, and it teaches people to tune the
  // banner out before it ever says something that matters.
  if (kind === "paid" && nearlySpent.length === 0) return null;
  // A spent allowance is not an upsell: something the customer is paying for has stopped,
  // so it stays on screen until they act on it.
  if (kind !== "limit" && dismissed.includes(kind)) return null;

  function dismiss() {
    const next = [...dismissed, kind];
    setDismissed(next);
    try {
      globalThis.localStorage?.setItem(DISMISS_KEY, JSON.stringify(next));
    } catch {
      // A blocked localStorage only costs the banner its memory for this session.
    }
  }

  const labels = (kind === "limit" ? exhausted : nearlySpent)
    .map((entry) => translations(entry.label))
    .join(", ");
  const { message, cta } = planBannerCopy(kind, isFreePlan, labels, translations);

  return (
    <div
      // h-14 matches the nav panel's header (`h-14 … border-b` in app-sidebar), so the two
      // bottom borders meet and read as one line across the sidebar and the page. Fixed
      // height means the message cannot wrap — it truncates instead.
      className={`flex h-14 shrink-0 items-center justify-between gap-3 border-b px-4 text-sm ${
        kind === "limit"
          ? "border-destructive/30 bg-destructive/10 text-destructive"
          : "border-border bg-primary/5 text-foreground"
      }`}
    >
      <span className="flex min-w-0 items-center gap-2">
        {kind === "limit" ? (
          <IconAlertTriangle className="h-4 w-4 shrink-0" />
        ) : (
          <IconSparkles className="h-4 w-4 shrink-0 text-primary" />
        )}
        <span className="min-w-0 truncate">{message}</span>
      </span>

      <span className="flex shrink-0 items-center gap-1">
        <Button
          size="sm"
          variant={kind === "limit" ? "destructive" : "default"}
          className="gap-1"
          // Rendering as an anchor, so opt out of Base UI's native-<button> expectation.
          nativeButton={false}
          render={<Link to="/dashboard/settings/billing" />}
        >
          {cta}
          <IconArrowUpRight className="h-4 w-4" />
        </Button>
        {kind !== "limit" && (
          <Button
            size="sm"
            variant="ghost"
            aria-label={translations("Dismiss")}
            onClick={dismiss}
            className="h-8 w-8 p-0"
          >
            <IconX className="h-4 w-4" />
          </Button>
        )}
      </span>
    </div>
  );
}
