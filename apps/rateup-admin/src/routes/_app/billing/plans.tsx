import { IconChevronDown } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { rateupPlansQueryOptions, type GatewayPlan, type RateupPlan } from "@/api/billing.api";
import { JsonBlock } from "@/components/ds/json-block";
import { Pill } from "@/components/ds/pill";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ds/query-states";
import { PageHeader } from "@/components/shell/page-header";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { formatMoney, formatNumber, humanize } from "@/lib/format";

export const Route = createFileRoute("/_app/billing/plans")({
  component: PlansPage,
});

function PlansPage() {
  const query = useQuery(rateupPlansQueryOptions);
  const tiers = query.data?.filter((plan) => plan.planType === "BASE") ?? [];
  const addons = query.data?.filter((plan) => plan.planType === "ADDON") ?? [];

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title="Plans"
        description="The catalogue: every tier and add-on, what it costs and where it sells."
      />
      {query.isPending ? (
        <ListSkeleton rows={3} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : query.data.length === 0 ? (
        <EmptyState
          title="No plans yet"
          description="Seed the catalogue from Operations → Update center."
        />
      ) : (
        <>
          <PlanSection title="Tiers" plans={tiers} />
          {addons.length > 0 && <PlanSection title="Add-ons" plans={addons} />}
        </>
      )}
    </div>
  );
}

function PlanSection({ title, plans }: { title: string; plans: RateupPlan[] }) {
  return (
    <section className="flex flex-col gap-5">
      <h2 className="text-lg font-semibold tracking-tight">
        {title} · {plans.length}
      </h2>
      <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5 2xl:grid-cols-3">
        {plans.map((plan) => (
          <PlanCard key={plan.id} plan={plan} />
        ))}
      </ul>
    </section>
  );
}

function priceLine(plan: RateupPlan) {
  const { prices } = plan;
  const parts = [
    prices.monthly !== null && `${formatMoney(prices.monthly, "INR")} / mo`,
    prices.yearly !== null && `${formatMoney(prices.yearly, "INR")} / yr`,
    prices.usdMonthly !== null && `${formatMoney(prices.usdMonthly, "USD")} / mo`,
  ].filter(Boolean);
  if (parts.length) return parts.join(" · ");
  if (prices.price) return formatMoney(prices.price, prices.currency);
  return "Free";
}

const GATEWAY_SLOTS: { key: keyof RateupPlan["razorpay"]; label: string }[] = [
  { key: "monthly", label: "Monthly" },
  { key: "yearly", label: "Yearly" },
  { key: "usdMonthly", label: "USD monthly" },
  { key: "usdYearly", label: "USD yearly" },
  { key: "legacy", label: "Legacy" },
];

function GatewayStatus({ plan }: { plan: GatewayPlan }) {
  const live = plan.status === "ACTIVE" || plan.status === "LIVE";
  return <Pill tone={live ? "positive" : "muted"}>{humanize(plan.status)}</Pill>;
}

function PlanCard({ plan }: { plan: RateupPlan }) {
  const linked = GATEWAY_SLOTS.filter((slot) => plan.razorpay[slot.key]);
  return (
    <li className="flex min-w-0 flex-col gap-5 rounded-3xl border p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2">
            <span className="truncate text-[17px] font-semibold tracking-tight">
              {plan.displayName ?? plan.name}
            </span>
            {plan.badge && <Pill tone="ink">{plan.badge}</Pill>}
            {plan.displayWidgetId && <Pill tone="outline">On pricing widget</Pill>}
          </p>
          <p className="mt-1 text-sm text-muted-foreground tabular">{priceLine(plan)}</p>
        </div>
        <Link
          to="/orgs"
          search={{ plan: plan.id }}
          className="shrink-0 text-right"
          title="Organisations on this plan"
        >
          <span className="block text-[22px] leading-none font-light tabular">
            {formatNumber(plan.planType === "ADDON" ? plan.packsSold : plan.orgs)}
          </span>
          <span className="text-xs text-muted-foreground">
            {plan.planType === "ADDON" ? "packs sold" : "orgs"}
          </span>
        </Link>
      </div>

      {plan.description.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {plan.description.map((line) => (
            <li
              key={line}
              className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground"
            >
              {line}
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-2 text-sm">
        <p className="text-xs text-muted-foreground">Sells through</p>
        {linked.length === 0 && !plan.stripe && (
          <p className="text-muted-foreground">No gateway plan: granted by hand only.</p>
        )}
        {linked.map((slot) => {
          const gateway = plan.razorpay[slot.key]!;
          return (
            <div key={slot.key} className="flex items-center justify-between gap-3">
              <span className="min-w-0 truncate">
                Razorpay · {slot.label}{" "}
                <span className="font-mono text-xs text-muted-foreground">{gateway.planId}</span>
              </span>
              <GatewayStatus plan={gateway} />
            </div>
          );
        })}
        {plan.stripe && (
          <div className="flex items-center justify-between gap-3">
            <span className="min-w-0 truncate">
              Stripe{" "}
              <span className="font-mono text-xs text-muted-foreground">
                {plan.stripe.productId}
              </span>
            </span>
            <Pill tone={plan.stripe.status === "ACTIVE" ? "positive" : "muted"}>
              {humanize(plan.stripe.status)}
            </Pill>
          </div>
        )}
      </div>

      <Collapsible>
        <CollapsibleTrigger className="group flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase hover:text-foreground">
          Features
          <IconChevronDown className="size-3.5 transition-transform group-data-panel-open:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3">
          <JsonBlock value={plan.features ?? {}} />
        </CollapsibleContent>
      </Collapsible>
    </li>
  );
}
