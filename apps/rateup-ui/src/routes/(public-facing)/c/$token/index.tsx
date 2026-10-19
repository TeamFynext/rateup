import { createFileRoute } from "@tanstack/react-router";

import { CheckoutPage } from "@/components/shop-public/checkout/CheckoutPage.tsx";
import { noindexHead } from "@/lib/metadata.ts";

interface CheckoutSearch {
  /** Set by the payment gateway's return URL. */
  paid?: string;
}

export const Route = createFileRoute("/(public-facing)/c/$token/")({
  component: CheckoutRoute,
  validateSearch: (search: Record<string, unknown>): CheckoutSearch => ({
    paid: search.paid === "1" || search.paid === 1 ? "1" : undefined,
  }),
  head: () => {
    const base = noindexHead(undefined, { follow: false });
    return { ...base, meta: [...base.meta, { title: "Checkout" }] };
  },
});

function CheckoutRoute() {
  const { token } = Route.useParams();
  const { paid } = Route.useSearch();
  return <CheckoutPage token={token} justPaid={paid === "1"} />;
}
