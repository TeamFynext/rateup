import {
  Bell,
  ClipboardList,
  MapPin,
  MessageCircle,
  MessageSquareText,
  Pencil,
  Truck,
  UserRound,
} from "lucide-react";
import { useState } from "react";

import CollectionOptionsTab from "@/components/dashboard/commerce/CollectionOptionsTab";
import AddressFieldsTab from "@/components/dashboard/whatsapp/orders-and-payments/components/AddressFieldsTab";
import DeliveryOptionsTab from "@/components/dashboard/whatsapp/orders-and-payments/components/DeliveryOptionsTab";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import { useCommerce } from "../CommerceContext";
import { CommerceShell } from "../CommerceShell";

const TIMINGS = [
  { id: "30m", label: "30 minutes" },
  { id: "1h", label: "1 hour" },
  { id: "3h", label: "3 hours" },
  { id: "24h", label: "24 hours" },
];

const CHECKOUT_TOGGLES = [
  {
    key: "orderConfirm",
    icon: Bell,
    label: "Send order confirmation",
    desc: "Auto-message the customer when an order is placed",
  },
  {
    key: "guest",
    icon: UserRound,
    label: "Guest checkout",
    desc: "Let customers buy without sharing extra details",
  },
  {
    key: "notes",
    icon: MessageSquareText,
    label: "Order notes",
    desc: "Allow customers to add a note at checkout",
  },
] as const;

function NoCatalog({ children }: Readonly<{ children: string }>) {
  return (
    <Alert>
      <MapPin />
      <AlertTitle>No catalog connected</AlertTitle>
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}

export function CheckoutSettingsPage() {
  const { catalogId, isCatalogConnected, currencySymbol: sym } = useCommerce();

  const [abandonedOn, setAbandonedOn] = useState(true);
  const [reminderTiming, setReminderTiming] = useState("1h");
  const [checkout, setCheckout] = useState<Record<string, boolean>>({
    orderConfirm: true,
    guest: true,
    notes: false,
  });

  const taxFields = [
    { label: "Tax rate (GST)", value: "18%" },
    { label: "Shipping charge", value: `${sym}49` },
    { label: "Free shipping over", value: `${sym}999` },
    { label: "Minimum order value", value: `${sym}199` },
  ];

  return (
    <CommerceShell
      title="Checkout Settings"
      description="Taxes, address collection, delivery and checkout behaviour."
    >
      <Tabs defaultValue="collection" className="flex flex-col gap-5">
        <TabsList className="grid w-full max-w-2xl grid-cols-3">
          {/* TODO:commerce */}
          {/* <TabsTrigger value="general">
            <Settings2 data-icon="inline-start" />
            General
          </TabsTrigger> */}
          <TabsTrigger value="collection">
            <ClipboardList data-icon="inline-start" />
            Collection
          </TabsTrigger>
          <TabsTrigger value="address">
            <MapPin data-icon="inline-start" />
            Address Fields
          </TabsTrigger>
          <TabsTrigger value="delivery">
            <Truck data-icon="inline-start" />
            Delivery Options
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-0">
          <div className="flex max-w-[760px] flex-col gap-4">
            {/* Taxes & charges */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Taxes & charges</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Applied at checkout on the WhatsApp cart.
                </p>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {taxFields.map((f) => (
                  <div key={f.label}>
                    <div className="mb-1.5 text-xs font-semibold text-foreground">{f.label}</div>
                    <div className="flex items-center gap-2 rounded-md border px-3 py-2.5">
                      <span className="flex-1 text-sm font-medium text-foreground">{f.value}</span>
                      <Pencil className="size-3.5 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Abandoned cart recovery */}
            <Card>
              <CardHeader className="flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-sm">Abandoned cart recovery</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Automatically remind customers who leave items in their cart.
                  </p>
                </div>
                <Switch checked={abandonedOn} onCheckedChange={setAbandonedOn} />
              </CardHeader>
              {abandonedOn && (
                <CardContent className="flex flex-col gap-3 border-t pt-4">
                  <div className="text-xs font-semibold text-foreground">Send reminder after</div>
                  <ToggleGroup
                    value={[reminderTiming]}
                    onValueChange={(v) => v[0] && setReminderTiming(v[0])}
                    className="w-fit"
                  >
                    {TIMINGS.map((t) => (
                      <ToggleGroupItem key={t.id} value={t.id}>
                        {t.label}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                  <div className="mt-1 flex items-start gap-2.5 rounded-lg bg-muted p-3">
                    <MessageCircle className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                    <p className="text-sm text-muted-foreground">
                      "Hi {"{name}"} 👋 You left {"{items}"} in your cart. Complete your order now
                      and get free shipping —{" "}
                      <span className="font-medium text-primary">tap to checkout</span>."
                    </p>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Checkout experience */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Checkout experience</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col">
                {CHECKOUT_TOGGLES.map((t, idx) => (
                  <div key={t.key}>
                    <div className="flex items-center justify-between py-2.5">
                      <div className="flex items-center gap-2.5">
                        <t.icon className="size-4 text-muted-foreground" />
                        <div>
                          <div className="text-sm font-medium text-foreground">{t.label}</div>
                          <div className="text-xs text-muted-foreground">{t.desc}</div>
                        </div>
                      </div>
                      <Switch
                        checked={checkout[t.key]}
                        onCheckedChange={(v) => setCheckout((p) => ({ ...p, [t.key]: v }))}
                      />
                    </div>
                    {idx < CHECKOUT_TOGGLES.length - 1 && <Separator />}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="collection" className="mt-0">
          {isCatalogConnected ? (
            <CollectionOptionsTab catalogId={catalogId} />
          ) : (
            <NoCatalog>
              Connect a WhatsApp catalog to this store to configure collection options.
            </NoCatalog>
          )}
        </TabsContent>

        <TabsContent value="address" className="mt-0">
          {isCatalogConnected ? (
            <AddressFieldsTab catalogId={catalogId} />
          ) : (
            <NoCatalog>
              Connect a WhatsApp catalog to this store to configure address collection.
            </NoCatalog>
          )}
        </TabsContent>

        <TabsContent value="delivery" className="mt-0">
          {isCatalogConnected ? (
            <DeliveryOptionsTab catalogId={catalogId} />
          ) : (
            <NoCatalog>
              Connect a WhatsApp catalog to this store to configure delivery options.
            </NoCatalog>
          )}
        </TabsContent>
      </Tabs>
    </CommerceShell>
  );
}
