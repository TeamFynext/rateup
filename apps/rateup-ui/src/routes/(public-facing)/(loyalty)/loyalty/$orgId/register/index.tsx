import { createFileRoute } from "@tanstack/react-router";

import { RegisterPage } from "@/components/public-facing/loyalty/loyalty/register/RegisterPage.tsx";
import { noindexHead } from "@/lib/metadata.ts";

/**
 * A venue's public join page, reached from its QR poster and WhatsApp messages. It is one
 * per tenant with no search intent, so it is `noindex, nofollow` — stated here as well as
 * on the (public-facing) layout, so a change to that default cannot put it in the index.
 */
export const Route = createFileRoute("/(public-facing)/(loyalty)/loyalty/$orgId/register/")({
  head: () => noindexHead(undefined, { follow: false }),
  component: RouteComponent,
});

function RouteComponent() {
  return <RegisterPage />;
}
