import { useDisclosure } from "@mantine/hooks";
import { IconLogin2, IconRefresh, IconTrash } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  useDeleteWaCatalog,
  useDisconnectCatalogFromWa,
  useUpateCatalog,
} from "@/backend/whatsapp/catalog/catalog.query";
import {
  useProductSetsByCatalog,
  useSyncProductSets,
} from "@/backend/whatsapp/catalog/productSet.query";
import { useWaSettings } from "@/backend/whatsapp/settings/waSettings.query";
import RateupLoader from "@/components/Loaders/RateupLoader.tsx";
import ConfirmationModal from "@/components/Modal/ConfirmationModal.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { ImportFromShopifyModal } from "@/components/whatsapp/catalog/products/ImportFromShopifyModal.tsx";
import { MetaLoginAssets, WaConfigType } from "@/types/enums.ts";

const CatalogSettings = ({ catalogData }) => {
  const navigate = useNavigate();
  const update = useUpateCatalog(catalogData?.catalogId);
  const disconnect = useDisconnectCatalogFromWa(catalogData?.catalogId);
  const deleteCatalog = useDeleteWaCatalog();
  const [opened, { open, close }] = useDisclosure(false);
  const [openedConnect, { open: openConnect, close: closeConnect }] = useDisclosure(false);
  const [openedDelete, { open: openDelete, close: closeDelete }] = useDisclosure(false);
  const [wabaId, setWabaId] = useState("");
  const [connectMode, setConnectMode] = useState<"manual" | "automatic">("automatic");
  const { data: waSettings, isLoading } = useWaSettings();
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
        catalogData.connectedWaPhoneIds.some((c) => c.whatsappSettingsPhoneId === s.phoneId),
      );
      if (setting) {
        setWabaId(setting.wabaId);
      } else {
        setWabaId("");
      }
    }
  }, [catalogData, waSettings]);
  function handleDisconnect() {
    if (!wabaId) {
      toast.error("Try again!");
      return;
    }
    const settings = waSettings.find((s) =>
      s.wabaId === wabaId && s.type === WaConfigType.Automated
        ? s.assets.includes(MetaLoginAssets.CATALOGS)
        : true,
    );
    disconnect.mutate(
      { catalogId: catalogData?.catalogId, whatsappSettingsId: settings.id },
      {
        onSuccess: () => {
          setWabaId("");
          close();
        },
      },
    );
  }
  function handleConnect() {
    update.mutate(
      { wabaId, syncWithMeta: connectMode === "automatic" },
      {
        onSuccess: () => {
          closeConnect();
        },
      },
    );
  }
  if (isLoading) return <RateupLoader />;
  return (
    <Card className="flex flex-col gap-4 p-2">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <Field className="w-full sm:w-1/2">
          <FieldLabel>Connected WhatsApp Business Account ID</FieldLabel>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm font-medium">Normal Account</span>
            <Switch
              checked={connectMode === "manual"}
              onCheckedChange={(checked) => setConnectMode(checked ? "manual" : "automatic")}
            />
            <span className="text-sm font-medium">SMB (Coexistence Account)</span>
          </div>
          <Select
            value={wabaId}
            onValueChange={(value) => {
              setWabaId(value);
              openConnect();
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {wabaIds.map((id) => (
                <SelectItem key={id} value={id}>
                  {id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Button variant="destructive" onClick={open} disabled={disconnect.isPending}>
          <IconLogin2 size={16} />
          Disconnect WhatsApp Business Account
        </Button>
      </div>

      <p className="font-semibold mt-4">Shopify Checkout Automation</p>
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="flex flex-col gap-0.5">
          <FieldLabel htmlFor="auto-checkout" className="cursor-pointer">
            Auto-generate Shopify Checkout Link
          </FieldLabel>
          <p className="text-sm text-muted-foreground">
            Automatically send a Shopify checkout link when a customer sends a cart.
          </p>
        </div>
        <Switch
          id="auto-checkout"
          checked={catalogData.autoCheckoutEnabled}
          onCheckedChange={(checked) => {
            update.mutate({ autoCheckoutEnabled: checked });
          }}
        />
      </div>
      {catalogData.autoCheckoutEnabled && (
        <Field>
          <FieldLabel>Checkout Message</FieldLabel>
          <Input
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

      <ConfirmationModal
        forDeleteFunctionality
        deleteQuotion={"The catalog in automation on the connected accont won't work."}
        opened={opened}
        onClose={close}
        onConfirm={handleDisconnect}
        confirmLabel={"Disconnect"}
        headerLabel={"Are you sure you want to disconnect catalog from whatsapp"}
        headerTitle={"Disconnect Whatsapp Business Account"}
        loading={disconnect.isPending}
        closeAfterOnConfirm={false}
      />
      <ConfirmationModal
        opened={openedConnect}
        onClose={closeConnect}
        onConfirm={handleConnect}
        confirmLabel={"Connect"}
        headerLabel={`Are you sure you want to connect this catalog to WhatsApp Business Account (WABA ID: ${wabaId})? Mode: ${connectMode === "automatic" ? "Normal Account — will also update in Meta" : "SMB (Coexistence Account) — DB only, no Meta update"}`}
        headerTitle={"Connect Whatsapp Business Account"}
        loading={update.isPending}
        closeAfterOnConfirm={false}
      />

      <Separator className="mt-4" />
      <ProductManagementSection catalogData={catalogData} />

      <Separator className="mt-4" />
      <ProductSetsSection catalogId={catalogData?.catalogId} />

      <Separator className="mt-8" />
      <div className="flex flex-col gap-3 p-4 border border-destructive/30 rounded-lg bg-destructive/5">
        <div className="flex flex-col gap-1">
          <p className="font-semibold text-destructive">Danger Zone</p>
          <p className="text-sm text-destructive/80">
            Deleting this catalog is permanent and cannot be undone. All associated products,
            product sets, orders, and settings will be removed. Any automations using this catalog
            will stop working.
          </p>
        </div>
        <Button
          variant="destructive"
          className="w-fit"
          onClick={openDelete}
          disabled={deleteCatalog.isPending}
        >
          <IconTrash size={16} />
          Delete Catalog
        </Button>
      </div>

      <ConfirmationModal
        forDeleteFunctionality
        deleteQuotion="All products, orders, product sets, and automation links tied to this catalog will be permanently deleted."
        opened={openedDelete}
        onClose={closeDelete}
        onConfirm={() =>
          deleteCatalog.mutate(catalogData?.catalogId, {
            onSuccess: () => {
              closeDelete();
              navigate({ to: "/dashboard/whatsapp/catalog" });
            },
          })
        }
        confirmLabel="Delete Catalog"
        headerLabel={`Are you sure you want to permanently delete "${catalogData?.name}"?`}
        headerTitle="Delete Catalog"
        loading={deleteCatalog.isPending}
        closeAfterOnConfirm={false}
      />
    </Card>
  );
};

const ProductManagementSection = ({ catalogData }) => {
  const catalogId = catalogData?.catalogId;
  const [shopifyImportOpened, { close: closeShopifyImport }] = useDisclosure(false);

  return (
    <div className="flex flex-col gap-2 mt-4">
      <p className="font-semibold">Product Management</p>

      {/* Import from Shopify
      <div className="flex flex-col gap-1">
        <div className="flex justify-between items-center p-3 border border-gray-300 rounded-lg bg-gray-50">
          <div className="flex flex-col gap-1">
            <p className="font-medium text-sm">Import from Shopify</p>
            <p className="text-xs text-gray-500">
              Browse your Shopify products and selectively add new ones to this
              catalog.
            </p>
          </div>
          <RateupButtonBlue
            leftIcon={<IconShoppingBag size={16} />}
            onClick={openShopifyImport}
            title="Import from Shopify"
            w="fit-content"
            disabled={!catalogId || !shopifyIntegration || shopifyLoading}
          />
        </div>
        {!shopifyLoading && !shopifyIntegration && (
          <p className="text-xs text-red-500 italic mt-1 ml-1">
            Shopify is not connected. Connect your store from Apps & Services to
            enable imports.
          </p>
        )}
      </div>
      */}

      <ImportFromShopifyModal
        catalogId={catalogId}
        opened={shopifyImportOpened}
        onClose={closeShopifyImport}
      />
    </div>
  );
};

const ProductSetsSection = ({ catalogId }) => {
  const syncProductSetsMut = useSyncProductSets();
  const { data: productSets, isLoading } = useProductSetsByCatalog(catalogId);

  return (
    <div className="flex flex-col gap-2 mt-4">
      <div className="flex justify-between items-center">
        <div className="flex flex-col gap-0">
          <p className="font-semibold">Product Sets</p>
          <p className="text-sm text-muted-foreground">
            Curated collections synced from your Meta Catalog
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => syncProductSetsMut.mutate(catalogId)}
          disabled={syncProductSetsMut.isPending}
        >
          <IconRefresh size={16} />
          Sync from Meta
        </Button>
      </div>

      {isLoading ? (
        <div className="w-5 h-5 border-2 border-border border-t-primary rounded-full animate-spin" />
      ) : productSets && productSets.length > 0 ? (
        <div className="flex flex-col gap-3 mt-2">
          {productSets.map((set: any) => (
            <div
              key={set.productSetId}
              className="flex justify-between items-center p-3 border rounded-lg bg-muted/40"
            >
              <div className="flex flex-col gap-1">
                <p className="font-medium text-sm">{set.name}</p>
                <p className="text-xs text-muted-foreground">ID: {set.productSetId}</p>
              </div>
              <span className="bg-primary/10 text-primary px-2 py-1 rounded text-xs font-medium">
                {set.productIds?.length || 0} Products
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground italic">No product sets synced yet.</p>
      )}
    </div>
  );
};

export default CatalogSettings;
