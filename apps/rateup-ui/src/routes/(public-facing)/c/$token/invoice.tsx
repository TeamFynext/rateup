import { createFileRoute } from "@tanstack/react-router";

import { InvoiceView } from "@/components/shop-public/checkout/InvoiceView.tsx";
import { noindexHead } from "@/lib/metadata.ts";

export const Route = createFileRoute("/(public-facing)/c/$token/invoice")({
  component: InvoiceRoute,
  head: () => {
    const base = noindexHead(undefined, { follow: false });
    return { ...base, meta: [...base.meta, { title: "Invoice" }] };
  },
});

function InvoiceRoute() {
  const { token } = Route.useParams();
  return <InvoiceView token={token} />;
}
