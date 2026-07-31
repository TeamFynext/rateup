import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  MoreVertical,
  RefreshCw,
  X,
  XCircle,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { useCatalogSettings, useCreateAddressFlow } from "@/backend/whatsapp/catalog/catalog.query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PhonePreviewButton } from "@/components/ui/phone-preview";
import { WaQuestions } from "@/types/enums";

const SHOPIFY_FIELDS = [
  { label: "First Name", shopifyKey: "first_name", required: true },
  { label: "Last Name", shopifyKey: "last_name", required: false },
  { label: "Phone Number", shopifyKey: "phone", required: true, fixed: true },
  { label: "Address Line 1", shopifyKey: "address1", required: true },
  { label: "Address Line 2", shopifyKey: "address2", required: false },
  { label: "City", shopifyKey: "city", required: true },
  { label: "State", shopifyKey: "province", required: true },
  { label: "Pincode", shopifyKey: "zip", required: true },
  {
    label: "Country",
    shopifyKey: "country_code",
    required: true,
    fixed: true,
    value: "IN (Auto)",
  },
];

/**
 * WhatsApp Flow sheet as the customer sees it — rendered inside the global phone
 * preview. Uses semantic tokens so it follows the app's light/dark theme; only the
 * WhatsApp green CTA is a fixed brand color (it reads on both themes).
 */
function AddressFlowPreview() {
  return (
    <div className="flex h-full flex-col bg-background text-foreground">
      {/* Drag handle */}
      <div className="mx-auto my-2 h-1 w-10 shrink-0 rounded-full bg-muted-foreground/30" />

      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
        <X className="size-5 text-muted-foreground" />
        <span className="text-sm font-semibold text-foreground">Shipping Address</span>
        <MoreVertical className="size-5 text-muted-foreground" />
      </div>

      {/* Fields */}
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-3">
        {SHOPIFY_FIELDS.map((field) => {
          const displayLabel = field.value
            ? `${field.label}: ${field.value}`
            : field.required
              ? field.label
              : `${field.label} (optional)`;

          return (
            <div key={field.shopifyKey} className="flex flex-col gap-1">
              <div className="flex items-center justify-between rounded-xl border bg-muted px-3 py-2.5 text-xs font-medium text-muted-foreground">
                <span>{displayLabel}</span>
                {field.fixed && (
                  <span className="rounded bg-foreground/10 px-1.5 py-0.5 text-[9px] text-muted-foreground">
                    Fixed
                  </span>
                )}
              </div>
              {field.shopifyKey === "address2" && (
                <p className="px-1 text-[10px] italic text-muted-foreground">
                  Optional — landmark, apartment, etc.
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Confirm */}
      <div className="shrink-0 border-t p-3">
        <div className="flex w-full items-center justify-center rounded-full bg-[#00a884] py-2.5 text-xs font-semibold text-white">
          Confirm Address
        </div>
      </div>
    </div>
  );
}

const STATUS_CONFIG = {
  idle: {
    icon: <AlertCircle className="h-5 w-5 text-muted-foreground" />,
    label: "Not Created",
    color: "text-muted-foreground",
    badge: "secondary" as const,
  },
  submitting: {
    icon: <Loader2 className="h-5 w-5 animate-spin text-blue-500" />,
    label: "Submitting…",
    color: "text-blue-600",
    badge: "default" as const,
  },
  review: {
    icon: <Clock className="h-5 w-5 text-amber-500" />,
    label: "Under Meta Review",
    color: "text-amber-600",
    badge: "outline" as const,
  },
  approved: {
    icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
    label: "Approved & Active",
    color: "text-green-600",
    badge: "default" as const,
  },
  rejected: {
    icon: <XCircle className="h-5 w-5 text-red-500" />,
    label: "Rejected by Meta",
    color: "text-red-600",
    badge: "destructive" as const,
  },
};

export default function AddressFieldsTab({ catalogId }: { catalogId: string }) {
  const isReview = true; // will poll when status is review
  const { data: settings, isLoading } = useCatalogSettings(catalogId, isReview);
  const { mutate: createFlow, isPending: isCreating } = useCreateAddressFlow(catalogId);

  if (isLoading || !catalogId) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-xl bg-muted/30 animate-pulse" />
        ))}
      </div>
    );
  }

  const status = (settings?.addressFlowStatus ?? "idle") as keyof typeof STATUS_CONFIG;
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.idle;
  const canCreate = status === "idle" || status === "rejected";
  const isPolling = status === "review" || status === "submitting";

  const handleCreateFlow = () => {
    try {
      const enabledFields = SHOPIFY_FIELDS.filter((f) => f.shopifyKey !== "country_code");

      const screens = [
        {
          id: "ADDRESS_SCREEN",
          title: "Shipping Address",
          terminal: true,
          layout: {
            type: "SingleColumnLayout",
            children: [
              ...enabledFields.map((f) => {
                const id = `field_${f.shopifyKey}_${Math.random().toString(36).substring(2, 9)}`;
                return {
                  id,
                  type: WaQuestions.TextInput,
                  metaType: "TextInput", // Use string to avoid enum mismatch if any
                  name: f.shopifyKey,
                  label: f.label,
                  required: f.required,
                  "input-type": f.shopifyKey === "phone" ? "phone" : "text",
                  visible: true,
                  ...(f.shopifyKey === "address2" && {
                    "helper-text": "Optional — landmark, apartment, etc.",
                  }),
                };
              }),
              {
                id: `footer_${Math.random().toString(36).substring(2, 9)}`,
                type: WaQuestions.Footer,
                metaType: "Footer",
                label: "Confirm Address",
                "on-click-action": {
                  name: "complete",
                  payload: enabledFields.reduce(
                    (acc: unknown, f) => {
                      acc[f.shopifyKey] = `\${screen.ADDRESS_SCREEN.form.${f.shopifyKey}}`;
                      return acc;
                    },
                    { country_code: "IN" },
                  ),
                },
              },
            ],
          },
        },
      ];

      const map: Record<string, any> = {};
      enabledFields.forEach((f) => {
        map[f.shopifyKey] = {
          type: f.shopifyKey === "phone" ? "Phone" : "ShortText",
        };
      });

      createFlow({
        json: {
          version: "7.2",
          screens,
        },
        map,
      });
    } catch (err) {
      console.error("Error building flow JSON:", err);
      toast.error("Failed to prepare flow data");
    }
  };

  return (
    <div className="flex max-w-[760px] flex-col gap-4">
      <div className="flex items-center justify-end">
        <PhonePreviewButton platform="whatsapp" label="Preview form">
          <AddressFlowPreview />
        </PhonePreviewButton>
      </div>

      <div className="flex flex-col gap-4">
        {/* Flow status panel */}
        <Card
          className={`${status === "approved" ? "border-green-300 bg-green-50/40 dark:bg-green-950/20" : status === "rejected" ? "border-red-300 bg-red-50/40 dark:bg-red-950/20" : status === "review" ? "border-amber-300 bg-amber-50/40 dark:bg-amber-950/20" : ""}`}
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="text-base">WhatsApp Address Flow</CardTitle>
                <CardDescription className="text-xs mt-1">
                  A Meta-approved form sent to customers after they place an order. Collects their
                  shipping address inside WhatsApp.
                </CardDescription>
              </div>
              <Badge variant={cfg.badge} className="shrink-0">
                {cfg.label}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              {cfg.icon}
              <div>
                <p className={`font-medium text-sm ${cfg.color}`}>{cfg.label}</p>
                {status === "review" && (
                  <p className="text-xs text-muted-foreground">
                    Meta review typically takes 1–3 business days. This page auto-refreshes every 10
                    seconds.
                  </p>
                )}
                {status === "approved" && settings?.addressFlowId && (
                  <p className="text-xs text-muted-foreground">
                    Flow ID:{" "}
                    <code className="font-mono bg-muted px-1 rounded">
                      {settings.addressFlowId}
                    </code>
                  </p>
                )}
                {status === "idle" && (
                  <p className="text-xs text-muted-foreground">
                    Click "Create Address Flow" to generate the form and submit it to Meta for
                    review.
                  </p>
                )}
                {status === "rejected" && (
                  <p className="text-xs text-muted-foreground">
                    Meta rejected the flow. Click "Resubmit" to create a new one.
                  </p>
                )}
              </div>
            </div>

            {canCreate && (
              <Button
                onClick={handleCreateFlow}
                disabled={isCreating || !catalogId}
                size="sm"
                className="gap-2"
              >
                {isCreating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Zap className="h-3.5 w-3.5" />
                )}
                {status === "rejected" ? "Resubmit Address Flow" : "Create Address Flow"}
              </Button>
            )}

            {isPolling && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                Auto-refreshing…
              </div>
            )}
          </CardContent>
        </Card>

        {/* Delivery note */}
        <Card className="border-dashed bg-muted/20">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start gap-3">
              <span className="text-xl">🚚</span>
              <div>
                <p className="text-sm font-medium">Delivery Selection (no Meta approval needed)</p>
                <p className="text-xs text-muted-foreground mt-1">
                  After address collection, the bot automatically sends a{" "}
                  <strong>WhatsApp List Message</strong> — an interactive dropdown with your enabled
                  delivery partners and their prices. The customer selects one and the bot
                  calculates the final total. Configure delivery partners in the{" "}
                  <strong>Delivery Options</strong> tab.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
