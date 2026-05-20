"use client";

// Lazy load integration pages
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";

import { ChevronLeft } from "lucide-react";
import { useExtracted } from "next-intl";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

const ShopifyPage = dynamic(
  () => import("@/app/dashboard/apps&services/shopify/page"),
);
const GoogleSheetPage = dynamic(
  () => import("@/app/dashboard/apps&services/googlesheet/page"),
);
const AmeliaPage = dynamic(
  () => import("@/app/dashboard/apps&services/amelia/page"),
);
const WaPaymentPage = dynamic(
  () => import("@/app/dashboard/apps&services/waPayment/page"),
);
const PetpoojaPage = dynamic(
  () => import("@/app/dashboard/apps&services/petpooja/page"),
);
const ZapierPage = dynamic(
  () => import("@/app/dashboard/apps&services/zapier/page"),
);
const ZohoPage = dynamic(
  () => import("@/app/dashboard/apps&services/zoho/page"),
);

const INTEGRATION_PAGES: Record<string, React.ComponentType<any>> = {
  shopify: ShopifyPage,
  googlesheet: GoogleSheetPage,
  amelia: AmeliaPage,
  waPayment: WaPaymentPage,
  petpooja: PetpoojaPage,
  zapier: ZapierPage,
  zoho: ZohoPage,
};

const INTEGRATION_NAMES: Record<string, string> = {
  shopify: "Shopify",
  googlesheet: "Google Sheets",
  amelia: "Amelia",
  waPayment: "WhatsApp Payment",
  petpooja: "Petpooja",
  zapier: "Zapier",
  zoho: "zoho",
};

export default function IntegrationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const t = useExtracted();

  const id = params.id as string;
  const Component = INTEGRATION_PAGES[id];
  const integrationName = INTEGRATION_NAMES[id];

  if (!Component) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/dashboard/settings/integrations")}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          {t("Back")}
        </Button>
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">
              {t("Integration not found")}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push("/dashboard/settings/integrations")}
      >
        <ChevronLeft className="h-4 w-4 mr-2" />
        {t("Back")} {t("to")} {integrationName}
      </Button>
      <div>
        <h2 className="text-2xl mb-1">{integrationName}</h2>
        <p className="text-sm text-muted-foreground">
          {t("Configure your")} {integrationName} {t("integration")}
        </p>
      </div>
      <Component />
    </div>
  );
}
