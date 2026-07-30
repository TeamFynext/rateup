import { useNavigate } from "@tanstack/react-router";
import { LogOut, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  useDeleteWaCatalog,
  useDisconnectCatalogFromWa,
  useUpateCatalog,
} from "@/backend/whatsapp/catalog/catalog.query";
import { useWaSettings } from "@/backend/whatsapp/settings/waSettings.query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useConfirm } from "@/context/confirm-provider";
import { MetaLoginAssets, WaConfigType } from "@/types/enums";

export default function CatalogSettingsTab({ catalogData }: Readonly<{ catalogData: any }>) {
  const navigate = useNavigate();
  const confirm = useConfirm();

  const catalogId = catalogData?.catalogId;
  const update = useUpateCatalog(catalogId);
  const disconnect = useDisconnectCatalogFromWa(catalogId);
  const deleteCatalog = useDeleteWaCatalog();
  const { data: waSettings, isLoading } = useWaSettings();

  const [wabaId, setWabaId] = useState("");
  const [connectMode, setConnectMode] = useState<"manual" | "automatic">("automatic");

  const wabaIds = waSettings
    ? Array.from(
        new Set(
          waSettings
            .filter((s) =>
              s.type === WaConfigType.Automated
                ? s.assets.includes(MetaLoginAssets.CATALOGS)
                : true,
            )
            .map((s) => s.wabaId),
        ),
      )
    : [];

  useEffect(() => {
    if (waSettings && catalogData) {
      const setting = waSettings.find((s) =>
        catalogData.connectedWaPhoneIds?.some((c: any) => c.whatsappSettingsPhoneId === s.phoneId),
      );
      setWabaId(setting?.wabaId ?? "");
    }
  }, [catalogData, waSettings]);

  async function handleConnect(selectedWabaId: string) {
    const ok = await confirm({
      title: "Connect WhatsApp Business Account",
      description: `Connect this catalog to WhatsApp Business Account (WABA ID: ${selectedWabaId})? Mode: ${
        connectMode === "automatic"
          ? "Normal Account — will also update in Meta"
          : "SMB (Coexistence Account) — DB only, no Meta update"
      }`,
      confirmText: "Connect",
    });
    if (!ok) return;
    update.mutate({ wabaId: selectedWabaId, syncWithMeta: connectMode === "automatic" });
  }

  async function handleDisconnect() {
    if (!wabaId) {
      toast.error("Try again!");
      return;
    }

    const ok = await confirm({
      title: "Disconnect WhatsApp Business Account",
      description: "Are you sure you want to disconnect this catalog from WhatsApp?",
      warning: "The catalog in automation on the connected account won't work.",
      confirmText: "Disconnect",
    });
    if (!ok) return;

    const setting = waSettings?.find((s) =>
      s.wabaId === wabaId && s.type === WaConfigType.Automated
        ? s.assets.includes(MetaLoginAssets.CATALOGS)
        : true,
    );
    if (!setting) return;

    disconnect.mutate(
      { catalogId, whatsappSettingsId: setting.id },
      { onSuccess: () => setWabaId("") },
    );
  }

  async function handleDelete() {
    const ok = await confirm({
      title: "Delete Catalog",
      description: `Are you sure you want to permanently delete "${catalogData?.name}"?`,
      warning:
        "All products, orders, product sets, and automation links tied to this catalog will be permanently deleted.",
      confirmText: "Delete Catalog",
    });
    if (!ok) return;

    deleteCatalog.mutate(catalogId, {
      onSuccess: () => navigate({ to: "/dashboard/commerce/catalogs" }),
    });
  }

  if (isLoading) {
    return (
      <div className="flex max-w-[760px] flex-col gap-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-40 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex max-w-[760px] flex-col gap-4">
      {/* WhatsApp Business Account */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">WhatsApp Business Account</CardTitle>
          <p className="text-xs text-muted-foreground">
            Link this catalog to a WABA so it can be used in chats and automation.
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <div className="text-sm font-medium text-foreground">SMB (Coexistence Account)</div>
              <div className="text-xs text-muted-foreground">
                Off = Normal Account (also updates Meta). On = DB only, no Meta update.
              </div>
            </div>
            <Switch
              checked={connectMode === "manual"}
              onCheckedChange={(checked) => setConnectMode(checked ? "manual" : "automatic")}
            />
          </div>

          <Field>
            <FieldLabel htmlFor="waba-id">Connected WhatsApp Business Account ID</FieldLabel>
            <Select
              value={wabaId}
              items={wabaIds.map((id) => ({ value: id, label: id }))}
              onValueChange={(value) => {
                setWabaId(value ?? "");
                handleConnect(value ?? "");
              }}
            >
              <SelectTrigger id="waba-id">
                <SelectValue placeholder="Select a WABA ID" />
              </SelectTrigger>
              <SelectContent>
                {wabaIds.map((id) => (
                  <SelectItem key={id} value={id}>
                    {id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldDescription>
              Selecting an account connects the catalog immediately.
            </FieldDescription>
          </Field>

          <Button
            variant="outline"
            className="w-fit"
            onClick={handleDisconnect}
            disabled={disconnect.isPending || !wabaId}
          >
            <LogOut data-icon="inline-start" />
            Disconnect WhatsApp Business Account
          </Button>
        </CardContent>
      </Card>

      {/* Shopify checkout automation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Shopify checkout automation</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-medium text-foreground">
                Auto-generate Shopify checkout link
              </div>
              <div className="text-xs text-muted-foreground">
                Automatically send a Shopify checkout link when a customer sends a cart.
              </div>
            </div>
            <Switch
              checked={!!catalogData?.autoCheckoutEnabled}
              onCheckedChange={(checked) => update.mutate({ autoCheckoutEnabled: checked })}
            />
          </div>

          {catalogData?.autoCheckoutEnabled && (
            <Field>
              <FieldLabel htmlFor="checkout-message">Checkout message</FieldLabel>
              <Input
                id="checkout-message"
                placeholder="Thanks for your order! Complete your purchase here: {{link}}"
                defaultValue={catalogData.checkoutMessage || ""}
                onBlur={(e) => {
                  if (e.target.value !== catalogData.checkoutMessage) {
                    update.mutate({ checkoutMessage: e.target.value });
                  }
                }}
              />
              <FieldDescription>
                Use {"{{link}}"} where you want the Shopify URL to appear.
              </FieldDescription>
            </Field>
          )}
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-destructive/30 bg-destructive/5">
        <CardHeader>
          <CardTitle className="text-sm text-destructive">Danger zone</CardTitle>
          <p className="text-xs text-destructive/80">
            Deleting this catalog is permanent and cannot be undone. All associated products,
            product sets, orders, and settings will be removed. Any automations using this catalog
            will stop working.
          </p>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            className="w-fit"
            onClick={handleDelete}
            disabled={deleteCatalog.isPending}
          >
            <Trash2 data-icon="inline-start" />
            Delete Catalog
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
