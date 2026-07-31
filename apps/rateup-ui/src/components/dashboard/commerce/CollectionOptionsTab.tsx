import { Info, Loader2, MapPin, Save, Truck } from "lucide-react";
import { useEffect, useState } from "react";

import type { CatalogSettings } from "@/backend/whatsapp/catalog/catalog.api";
import {
  useCatalogSettings,
  useUpdateCatalogSettings,
} from "@/backend/whatsapp/catalog/catalog.query";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

/**
 * Shopify's hosted checkout collects address and delivery on the Shopify store,
 * so these options don't apply to it. Every other method collects in WhatsApp.
 */
function isApplicable(settings: CatalogSettings | undefined) {
  return !(settings?.storeType === "shopify" && settings?.paymentMethod === "shopify_checkout");
}

export default function CollectionOptionsTab({ catalogId }: Readonly<{ catalogId: string }>) {
  const { data: settings } = useCatalogSettings(catalogId);
  const { mutateAsync: save, isPending: isSaving } = useUpdateCatalogSettings(catalogId);

  const [collectAddress, setCollectAddress] = useState(false);
  const [collectDelivery, setCollectDelivery] = useState(false);
  const [fixedDeliveryCharge, setFixedDeliveryCharge] = useState(false);
  const [fixedDeliveryAmount, setFixedDeliveryAmount] = useState(0);

  useEffect(() => {
    if (settings) {
      setCollectAddress(settings.collectAddress ?? false);
      setCollectDelivery(settings.collectDelivery ?? false);
      setFixedDeliveryCharge(settings.fixedDeliveryCharge ?? false);
      setFixedDeliveryAmount(settings.fixedDeliveryAmount ?? 0);
    }
  }, [settings]);

  const hasApprovedFlow = settings?.addressFlowStatus === "approved";

  // Carry the payment fields through so saving here never clears them.
  const handleSave = async () => {
    await save({
      storeType: settings?.storeType ?? "standard",
      paymentMethod: settings?.paymentMethod,
      standardPaymentConfig: settings?.standardPaymentConfig ?? {},
      collectAddress,
      collectDelivery,
      fixedDeliveryCharge,
      fixedDeliveryAmount,
    });
  };

  if (!isApplicable(settings)) {
    return (
      <Alert className="max-w-[760px]">
        <Info />
        <AlertTitle>Not applicable</AlertTitle>
        <AlertDescription>
          Your store uses the Shopify Checkout URL, which collects the address and delivery method
          on your Shopify store.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex max-w-[760px] flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Collection options</CardTitle>
          <p className="text-xs text-muted-foreground">
            What the customer is asked for during WhatsApp checkout.
          </p>
        </CardHeader>
        <CardContent className="flex flex-col">
          {/* Shipping address */}
          <div className="flex items-center justify-between gap-4 py-2.5">
            <div className="flex items-center gap-2.5">
              <MapPin className="size-4 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium text-foreground">Collect shipping address</div>
                <div className="text-xs text-muted-foreground">
                  Send a WhatsApp Flow form to collect the customer's address.
                  {!hasApprovedFlow && (
                    <span className="text-amber-600">
                      {" "}
                      Requires an approved address flow (see the Address Fields tab).
                    </span>
                  )}
                </div>
              </div>
            </div>
            <Switch
              checked={collectAddress}
              onCheckedChange={setCollectAddress}
              disabled={!hasApprovedFlow}
            />
          </div>

          <Separator />

          {/* Delivery charge */}
          <div className="flex items-center justify-between gap-4 py-2.5">
            <div className="flex items-center gap-2.5">
              <Truck className="size-4 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium text-foreground">Add delivery charge</div>
                <div className="text-xs text-muted-foreground">
                  Enable delivery charges for catalog orders. Price is added to the total.
                </div>
              </div>
            </div>
            <Switch checked={collectDelivery} onCheckedChange={setCollectDelivery} />
          </div>

          {collectDelivery && (
            <div className="mt-1 flex flex-col gap-3 rounded-lg border bg-muted/40 p-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-medium text-foreground">
                    Fixed delivery charge (skip customer selection)
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Automatically apply a fixed charge instead of asking the customer to pick a
                    delivery partner.
                  </div>
                </div>
                <Switch checked={fixedDeliveryCharge} onCheckedChange={setFixedDeliveryCharge} />
              </div>

              {fixedDeliveryCharge && (
                <Field className="border-t pt-3">
                  <FieldLabel htmlFor="fixed-amount" className="text-xs font-medium">
                    Fixed delivery amount (₹)
                  </FieldLabel>
                  <Input
                    id="fixed-amount"
                    type="number"
                    value={fixedDeliveryAmount}
                    onChange={(e) => setFixedDeliveryAmount(Number(e.target.value))}
                    placeholder="40"
                    className="h-8 w-36 text-sm"
                  />
                </Field>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {collectDelivery && !collectAddress && (
        <Alert>
          <Info />
          <AlertTitle>No address will be collected</AlertTitle>
          <AlertDescription>
            Delivery selection is on but address collection is off. The delivery charge is added to
            the total, but no address is collected.
          </AlertDescription>
        </Alert>
      )}

      <Button onClick={handleSave} disabled={isSaving || !catalogId} className="w-fit">
        {isSaving ? (
          <Loader2 data-icon="inline-start" className="animate-spin" />
        ) : (
          <Save data-icon="inline-start" />
        )}
        Save Settings
      </Button>
    </div>
  );
}
