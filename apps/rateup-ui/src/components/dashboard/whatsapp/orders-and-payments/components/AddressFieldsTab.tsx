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
                    (acc: any, f) => {
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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Left Column: Management Controls & Info Cards */}
      <div className="lg:col-span-7 space-y-6">
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

      {/* Right Column: Live Mobile Preview */}
      <div className="lg:col-span-5 bg-gradient-to-b from-muted/30 to-muted/10 border rounded-2xl p-6 flex flex-col items-center justify-center shadow-sm">
        <div className="w-full flex items-center justify-between border-b pb-3 mb-6">
          <div>
            <h3 className="text-sm font-semibold tracking-tight">Address Form Preview</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">Live smartphone simulation</p>
          </div>
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold bg-background shadow-sm border px-2.5 py-1 rounded-full">
            Mobile Preview
          </span>
        </div>

        {/* Smartphone Outer Frame */}
        <div className="w-[310px] sm:w-[330px] bg-[#0b141a] text-[#e9edef] rounded-[50px] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] border-[14px] border-[#22272e] relative overflow-hidden flex flex-col font-sans ring-1 ring-black/20 my-2">
          {/* Hardware Side Buttons */}
          <div className="absolute -left-[17px] top-24 w-[3px] h-6 bg-[#22272e] rounded-l-md" />
          <div className="absolute -left-[17px] top-36 w-[3px] h-12 bg-[#22272e] rounded-l-md" />
          <div className="absolute -left-[17px] top-52 w-[3px] h-12 bg-[#22272e] rounded-l-md" />
          <div className="absolute -right-[17px] top-36 w-[3px] h-16 bg-[#22272e] rounded-r-md" />

          {/* Dynamic Island */}
          <div className="absolute top-3 left-1/2 transform -translate-x-1/2 w-28 h-7 bg-black rounded-full z-50 flex items-center justify-between px-2.5 shadow-md">
            <div className="w-3 h-3 bg-[#111] rounded-full border border-gray-800 flex items-center justify-center">
              <div className="w-1 h-1 bg-emerald-500 rounded-full" />
            </div>
            <div className="w-1.5 h-1.5 bg-gray-900 rounded-full" />
          </div>

          {/* Status Bar */}
          <div className="flex items-center justify-between px-6 pt-3.5 pb-2 bg-[#0b141a] text-white text-xs font-semibold select-none">
            <span>9:41</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold scale-90">5G</span>
              {/* Battery Icon */}
              <div className="w-5 h-2.5 border border-white/80 rounded-[3px] p-[1px] flex items-center">
                <div className="h-full w-3.5 bg-white rounded-[1px]" />
                <div className="w-[2px] h-1 bg-white/80 rounded-r-sm ml-[1px]" />
              </div>
            </div>
          </div>

          {/* WhatsApp Flow Sheet Container */}
          <div className="flex-1 flex flex-col bg-[#0b141a]">
            {/* Top drag handle */}
            <div className="w-10 h-1 bg-[#3b4a54] rounded-full mx-auto my-2" />

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#222e35]">
              <X className="h-5 w-5 text-[#8696a0] cursor-pointer hover:text-[#e9edef] transition-colors" />
              <span className="font-semibold text-base text-[#e9edef]">Shipping Address</span>
              <MoreVertical className="h-5 w-5 text-[#8696a0] cursor-pointer hover:text-[#e9edef] transition-colors" />
            </div>

            {/* Form Body */}
            <div className="p-4 space-y-3.5 max-h-[380px] overflow-y-auto custom-scrollbar">
              {SHOPIFY_FIELDS.map((field) => {
                const displayLabel = field.value
                  ? `${field.label}: ${field.value}`
                  : field.required
                    ? field.label
                    : `${field.label} (optional)`;

                return (
                  <div key={field.shopifyKey} className="space-y-1">
                    <div className="rounded-xl bg-[#1f2c34] border border-[#2f3e46] px-4 py-3 text-sm font-medium text-[#8696a0] flex items-center justify-between shadow-inner">
                      <span>{displayLabel}</span>
                      {field.fixed && (
                        <span className="text-[10px] bg-[#3b4a54]/50 text-[#8696a0] px-1.5 py-0.5 rounded">
                          Fixed
                        </span>
                      )}
                    </div>
                    {field.shopifyKey === "address2" && (
                      <p className="text-[11px] text-[#8696a0] px-1 italic">
                        Optional — landmark, apartment, etc.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Bottom Bar */}
            <div className="p-4 border-t border-[#222e35] bg-[#0b141a]">
              <button
                type="button"
                className="w-full py-3 bg-[#00a884] text-[#111b21] font-semibold text-sm rounded-full flex items-center justify-center shadow-md hover:bg-[#06cf9c] transition-colors"
              >
                Confirm Address
              </button>
            </div>

            {/* Home Indicator */}
            <div className="pb-2.5 pt-1 bg-[#0b141a] flex justify-center">
              <div className="w-32 h-1 bg-[#ffffff]/30 rounded-full" />
            </div>
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground text-center italic mt-6">
          * Fields are pre-configured to ensure 1:1 compatibility with Shopify order fulfillment.
        </p>
      </div>
    </div>
  );
}
