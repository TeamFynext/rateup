// Routing and code-splitting only. Each integration renders its own `IntegrationShell`,
// because the status line needs facts that only that integration's query has.

import { IconPlugOff } from "@tabler/icons-react";
import { useParams } from "@tanstack/react-router";
// Lazy load integration pages
import { lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";

import { Skeleton } from "@/components/ui/skeleton.tsx";

import { IntegrationEmptyState } from "./IntegrationEmptyState.tsx";
import { IntegrationShell } from "./IntegrationShell.tsx";

const ShopifyPage = lazy(() =>
  import("@/components/app&services/Shopify.tsx").then((m) => ({
    default: m.Shopify,
  })),
);
const GoogleSheetPage = lazy(() =>
  import("@/components/app&services/GoogleSheet.tsx").then((m) => ({
    default: m.GoogleSheet,
  })),
);
const AmeliaPage = lazy(() =>
  import("@/components/app&services/WpAmelia.tsx").then((m) => ({
    default: m.WpAmelia,
  })),
);
const WaPaymentPage = lazy(() =>
  import("@/components/app&services/WhatsappPayment.tsx").then((m) => ({
    default: m.WhatsappPayment,
  })),
);
const PetpoojaPage = lazy(() =>
  import("@/components/app&services/PetpoojaIntegration.tsx").then((m) => ({
    default: m.PetpoojaIntegration,
  })),
);
const ZapierPage = lazy(() =>
  import("@/components/app&services/Zapier.tsx").then((m) => ({
    default: m.Zapier,
  })),
);
const ZohoPage = lazy(() =>
  import("@/components/app&services/Zoho.tsx").then((m) => ({
    default: m.Zoho,
  })),
);
const GetLeadPage = lazy(() =>
  import("@/components/app&services/GetLead.tsx").then((m) => ({
    default: m.GetLead,
  })),
);
// Hidden until WooCommerce and HubSpot launch — uncomment to show.
// const WooCommercePage = lazy(() =>
//   import("@/components/app&services/WooCommerce.tsx").then((m) => ({
//     default: m.WooCommerce,
//   })),
// );
// const HubSpotPage = lazy(() =>
//   import("@/components/app&services/HubSpot.tsx").then((m) => ({
//     default: m.HubSpot,
//   })),
// );
const ApiServicePage = lazy(() =>
  import("@/components/ExternalApi/ApiAccessKey.tsx").then((m) => ({
    default: m.default,
  })),
);
const WidgetPage = lazy(() =>
  import("@/components/dashboard/settings/integrations/WidgetIntegration.tsx").then((m) => ({
    default: m.default,
  })),
);
const WebhookPage = lazy(() =>
  import("@/components/dashboard/settings/integrations/WebhookIntegration.tsx").then((m) => ({
    default: m.default,
  })),
);

const INTEGRATION_PAGES: Record<string, React.ComponentType> = {
  shopify: ShopifyPage,
  googlesheet: GoogleSheetPage,
  amelia: AmeliaPage,
  waPayment: WaPaymentPage,
  petpooja: PetpoojaPage,
  zapier: ZapierPage,
  zoho: ZohoPage,
  getlead: GetLeadPage,
  // woocommerce: WooCommercePage,
  // hubspot: HubSpotPage,
  apiservice: ApiServicePage,
  widget: WidgetPage,
  webhook: WebhookPage,
};

/** The header and one card's worth of height, so the page does not jump when the chunk lands. */
function IntegrationFallback() {
  return (
    <div className="mx-auto flex w-full max-w-265 flex-col gap-6 pb-2">
      <div className="flex flex-col gap-4">
        <Skeleton className="h-5 w-28" />
        <div className="flex items-center gap-3">
          <Skeleton className="size-10 rounded-lg" />
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-56" />
          </div>
        </div>
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}

export function IntegrationDetailPage() {
  const params = useParams({
    strict: false,
  });
  const { t } = useTranslation();

  const id = params.id as string;
  const Component = INTEGRATION_PAGES[id];

  if (!Component) {
    return (
      <IntegrationShell icon={IconPlugOff} name={t("Integration not found")} own>
        <IntegrationEmptyState
          icon={IconPlugOff}
          title={t("This integration does not exist")}
          description={t(
            "The link may be out of date. Pick one from the integrations list instead.",
          )}
          action={null}
        />
      </IntegrationShell>
    );
  }

  return (
    <Suspense fallback={<IntegrationFallback />}>
      <Component />
    </Suspense>
  );
}
