// Extracted verbatim from the `/dashboard/settings/integrations/` route so the route file carries routing
// config only. Behaviour is unchanged.

import { IconAppWindow, IconKey, IconLoader2, IconWebhook } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import type { ComponentType } from "react";
import { useTranslation } from "react-i18next";

import { useIntegrationStatuses } from "@/backend/appsIntegration/integration.query";
import { useWebhook } from "@/backend/webhook/webhook.query";
import {
  AmeliaLogo,
  GoogleSheetsLogo,
  PetpoojaLogo,
  ShopifyLogo,
  WhatsAppPaymentLogo,
  ZapierLogo,
  ZohoCombinedLogo,
} from "@/components/integrations/logos";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";

type IntegrationStatus = "connected" | "disconnected";

interface IntegrationConfig {
  id: string;
  name: string;
  icon: ComponentType<{ className?: string }>;
  description: string;
  scope: "external" | "internal";
}

const INTEGRATIONS_CONFIG: Record<string, IntegrationConfig> = {
  shopify: {
    id: "shopify",
    name: "Shopify",
    icon: ShopifyLogo,
    description: "Sync products and orders from your Shopify store",
    scope: "external",
  },
  googlesheet: {
    id: "googlesheet",
    name: "Google Sheets",
    icon: GoogleSheetsLogo,
    description: "Export and sync data with Google Sheets",
    scope: "external",
  },
  amelia: {
    id: "amelia",
    name: "Amelia",
    icon: AmeliaLogo,
    description: "Appointment booking and scheduling integration",
    scope: "external",
  },
  waPayment: {
    id: "waPayment",
    name: "WhatsApp Payment",
    icon: WhatsAppPaymentLogo,
    description: "Enable payment collection via WhatsApp",
    scope: "external",
  },
  petpooja: {
    id: "petpooja",
    name: "Petpooja",
    icon: PetpoojaLogo,
    description: "Restaurant POS integration for order management",
    scope: "external",
  },
  zapier: {
    id: "zapier",
    name: "Zapier",
    icon: ZapierLogo,
    description: "Connect with 5000+ apps and automate workflows",
    scope: "external",
  },
  zoho: {
    id: "zoho",
    name: "Zoho CRM/Bigin",
    icon: ZohoCombinedLogo,
    description: "Sync contacts and leads seamlessly with Zoho",
    scope: "external",
  },
  apiservice: {
    id: "apiservice",
    name: "API Service",
    icon: IconKey,
    description: "Manage RateUp API access keys",
    scope: "internal",
  },
  widget: {
    id: "widget",
    name: "Widget",
    icon: IconAppWindow,
    description: "Configure your RateUp support widget",
    scope: "internal",
  },
  webhook: {
    id: "webhook",
    name: "Webhook",
    icon: IconWebhook,
    description: "Configure webhook endpoint and event delivery",
    scope: "internal",
  },
};

export function IntegrationsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: webhook } = useWebhook();
  const { data: integrationStatuses = [], isLoading: statusesLoading } = useIntegrationStatuses();

  const getIntegrationStatus = (integrationId: string): IntegrationStatus => {
    if (integrationId === "webhook") {
      return webhook?.url ? "connected" : "disconnected";
    }
    const status = integrationStatuses.find((s: { name?: string }) => s.name === integrationId);
    return status?.isConnected ? "connected" : "disconnected";
  };

  const handleOpenCard = (id: string) => {
    navigate({
      to: `/dashboard/settings/integrations/${id}`,
    });
  };

  return (
    <div className="space-y-6 pb-2">
      <div>
        <h2 className="text-2xl mb-1">{t("Integrations")}</h2>
      </div>
      {statusesLoading ? (
        <div className="flex items-center justify-center py-8">
          <IconLoader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-6">
          {(
            [
              {
                key: "internal",
                title: t("RateUp Services"),
                description: t("Built-in RateUp services"),
              },
              {
                key: "external",
                title: t("External"),
                description: t("Third-party platforms and partner services"),
              },
            ] as const
          ).map((group) => {
            const items = Object.entries(INTEGRATIONS_CONFIG).filter(
              ([, config]) => config.scope === group.key,
            );

            if (items.length === 0) return null;

            return (
              <section key={group.key} className="space-y-3">
                <div>
                  <h3 className="text-lg font-semibold">{group.title}</h3>
                  <p className="text-sm text-muted-foreground">{group.description}</p>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
                  {items.map(([id, config]) => {
                    const status = getIntegrationStatus(id);
                    const isInternal = config.scope === "internal";
                    let badgeVariant: "default" | "secondary" = "secondary";
                    if (!isInternal && status === "connected") {
                      badgeVariant = "default";
                    }

                    let badgeClassName = "bg-gray-200 dark:bg-gray-800 text-foreground";
                    if (isInternal) {
                      badgeClassName = "bg-primary/10 text-primary";
                    } else if (status === "connected") {
                      badgeClassName = "bg-green-600 text-background";
                    }

                    let lastSyncText = "Never";
                    if (isInternal) {
                      lastSyncText = "-";
                    }

                    let buttonVariant: "default" | "outline" = "default";
                    if (isInternal || status === "connected") {
                      buttonVariant = "outline";
                    }

                    let buttonClassName = "w-full mt-2 transition-all";
                    if (status === "connected") {
                      buttonClassName =
                        "w-full mt-2 bg-gray-200 hover:bg-gray-300 text-foreground dark:bg-gray-800 dark:hover:bg-gray-700 transition-all";
                    }

                    let actionText = t("Connect");
                    if (isInternal) {
                      actionText = t("Open");
                    } else if (status === "connected") {
                      actionText = t("Manage");
                    }

                    let badgeText: string = status;
                    if (isInternal) {
                      badgeText = t("Built-in");
                    }

                    return (
                      <Card
                        key={id}
                        className="hover:ring-1 hover:ring-primary group cursor-pointer"
                        onClick={() => handleOpenCard(id)}
                      >
                        <CardHeader>
                          <div className="flex items-start justify-between mb-4">
                            <div className="w-16 h-16 transition-all group-hover:scale-105">
                              <config.icon className="w-full h-full" />
                            </div>
                            <Badge variant={badgeVariant} className={badgeClassName}>
                              {badgeText}
                            </Badge>
                          </div>
                          <CardTitle>{config.name}</CardTitle>
                          <CardDescription>{config.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="mt-auto">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">{t("Last sync")}:</span>
                            <span className="text-foreground">{lastSyncText}</span>
                          </div>
                          <Button
                            variant={buttonVariant}
                            size="sm"
                            className={buttonClassName}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenCard(id);
                            }}
                          >
                            {actionText}
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
