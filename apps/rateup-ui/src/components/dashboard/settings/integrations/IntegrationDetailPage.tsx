// Extracted verbatim from the `/dashboard/settings/integrations/$id/` route so the route file carries routing
// config only. Behaviour is unchanged.

import { IconChevronLeft } from "@tabler/icons-react";
import { useNavigate, useParams } from "@tanstack/react-router";
// Lazy load integration pages
import { lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button.tsx";
import { Card, CardHeader, CardTitle } from "@/components/ui/card.tsx";

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
  apiservice: ApiServicePage,
  widget: WidgetPage,
  webhook: WebhookPage,
};

const INTEGRATION_NAMES: Record<string, string> = {
  shopify: "Shopify",
  googlesheet: "Google Sheets",
  amelia: "Amelia",
  waPayment: "WhatsApp Payment",
  petpooja: "Petpooja",
  zapier: "Zapier",
  zoho: "Zoho",
  apiservice: "API Service",
  widget: "Widget",
  webhook: "Webhook",
};

const INTERNAL_SERVICE_IDS = new Set(["apiservice", "widget", "webhook"]);

export function IntegrationDetailPage() {
  const params = useParams({
    strict: false,
  });
  const navigate = useNavigate();
  const { t } = useTranslation();

  const id = params.id as string;
  const Component = INTEGRATION_PAGES[id];
  const integrationName = INTEGRATION_NAMES[id];
  const isInternalService = INTERNAL_SERVICE_IDS.has(id);
  const backToIntegrations = () => navigate({ to: "/dashboard/settings/integrations" });

  if (!Component) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={backToIntegrations}>
          <IconChevronLeft className="h-4 w-4 mr-2" />
          {t("Back")}
        </Button>
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">{t("Integration not found")}</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-2">
      <Button variant="ghost" size="sm" onClick={backToIntegrations}>
        <IconChevronLeft className="h-4 w-4 mr-2" />
        {t("Back")} {t("to")} {integrationName}
      </Button>
      <div>
        <h2 className="text-2xl mb-1">{integrationName}</h2>
        <p className="text-sm text-muted-foreground">
          {isInternalService
            ? `${t("Configure your")} ${integrationName} ${t("settings")}`
            : `${t("Configure your")} ${integrationName} ${t("integration")}`}
        </p>
      </div>
      <Suspense fallback={<div className="flex items-center justify-center h-64">Loading...</div>}>
        <Component />
      </Suspense>
    </div>
  );
}
