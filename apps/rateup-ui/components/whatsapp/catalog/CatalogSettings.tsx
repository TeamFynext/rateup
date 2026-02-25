"use client";

import React, { useEffect, useMemo, useState } from "react";

import { useDisclosure } from "@mantine/hooks";
import {
  IconCheck,
  IconCloudDownload,
  IconLinkPlus,
  IconLogin2,
  IconRefresh,
  IconShoppingBag,
  IconX,
} from "@tabler/icons-react";

import { IntegratedApps, MetaLoginAssets, WaConfigType } from "@/types/enums";
import { useIntegrationByType } from "@/backend/appsIntegration/integration.query";
import {
  useDisconnectCatalogFromWa,
  useUpateCatalog,
  useWaCatalog,
} from "@/backend/whatsapp/catalog/catalog.query";
import {
  useProductSetsByCatalog,
  useSyncProductSets,
} from "@/backend/whatsapp/catalog/productSet.query";
import { useWaSettings } from "@/backend/whatsapp/settings/waSettings.query";
import { RateupButtonBlue } from "@/components/Button/RateupButtons";
import {
  ContainedSelection,
  ContainedSwitchInput,
  ContainedTextField,
} from "@/components/input/ContainedInput/ContainedInput";
import RateupLoader from "@/components/Loaders/RateupLoader";
import ConfirmationModal from "@/components/Modal/ConfirmationModal";
import { ImportFromShopifyModal } from "@/components/whatsapp/catalog/products/ImportFromShopifyModal";
import { showErrorToast } from "@/utils/notifications";

const CatalogSettings = ({ catalogData }) => {
  const update = useUpateCatalog(catalogData?.catalogId);
  const disconnect = useDisconnectCatalogFromWa(catalogData?.catalogId);
  const [opened, { open, close }] = useDisclosure(false);
  const [openedConnect, { open: openConnect, close: closeConnect }] =
    useDisclosure(false);
  const [wabaId, setWabaId] = useState("");
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
        catalogData.connectedWaPhoneIds.some(
          (c) => c.whatsappSettingsPhoneId === s.phoneId,
        ),
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
      showErrorToast("Try again!");
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
      { wabaId },
      {
        onSuccess: () => {
          closeConnect();
        },
      },
    );
  }
  if (isLoading) return <RateupLoader />;
  return (
    <div className="flex flex-col gap-4">
      <ContainedTextField
        value={catalogData.catalogId}
        disabled
        label={"Catalog ID"}
      />
      <ContainedTextField
        value={catalogData.name}
        disabled
        label={"Catalog Name"}
      />
      <ContainedTextField
        value={catalogData.vertical}
        disabled
        label={"Catalog vertical"}
      />
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div className="w-full sm:w-1/2">
          <ContainedSelection
            allowDeselect={false}
            label={"Connected Whatsapp Business Account ID"}
            placeholder="select"
            data={wabaIds}
            value={wabaId}
            onChange={(value) => {
              setWabaId(value);
              openConnect();
            }}
          />
        </div>
        <RateupButtonBlue
          leftIcon={<IconLogin2 />}
          color="red"
          w={"fit-content"}
          onClick={open}
          title="Disconnect Whatsapp Business Account"
          loading={disconnect.isPending}
        />
      </div>

      <p className="font-semibold mt-4">Shopify Checkout Automation</p>
      <ContainedSwitchInput
        label="Auto-generate Shopify Checkout Link"
        description="Automatically send a Shopify checkout link when a customer sends a cart."
        checked={catalogData.autoCheckoutEnabled}
        onChange={(event) => {
          update.mutate({ autoCheckoutEnabled: event.currentTarget.checked });
        }}
      />
      {catalogData.autoCheckoutEnabled && (
        <ContainedTextField
          label="Checkout Message"
          placeholder="Thanks for your order! Complete your purchase here: {{link}}"
          value={catalogData.checkoutMessage || ""}
          description="Use {{link}} where you want the Shopify URL to appear."
          onBlur={(event) => {
            if (event.target.value !== catalogData.checkoutMessage) {
              update.mutate({ checkoutMessage: event.target.value });
            }
          }}
        />
      )}

      <ConfirmationModal
        forDeleteFunctionality
        deleteQuotion={
          "The catalog in automation on the connected accont won't work."
        }
        opened={opened}
        onClose={close}
        onConfirm={handleDisconnect}
        confirmLabel={"Disconnect"}
        headerLabel={
          "Are you sure you want to disconnect catalog from whatsapp"
        }
        headerTitle={"Disconnect Whatsapp Business Account"}
        loading={disconnect.isPending}
        closeAfterOnConfirm={false}
      />
      <ConfirmationModal
        opened={openedConnect}
        onClose={closeConnect}
        onConfirm={handleConnect}
        confirmLabel={"Connect"}
        headerLabel={`Are you sure you want to connect this catalog to Whatsapp Business Account ( WABA ID: ${wabaId})`}
        headerTitle={"Connect Whatsapp Business Account"}
        loading={update.isPending}
        closeAfterOnConfirm={false}
      />

      <div className="h-px bg-gray-200 w-full mt-4" />
      <ProductManagementSection catalogData={catalogData} />

      <div className="h-px bg-gray-200 w-full mt-4" />
      <ProductSetsSection catalogId={catalogData?.catalogId} />
    </div>
  );
};

const ProductManagementSection = ({ catalogData }) => {
  const catalogId = catalogData?.catalogId;
  const [
    shopifyImportOpened,
    { open: openShopifyImport, close: closeShopifyImport },
  ] = useDisclosure(false);
  const { data: shopifyIntegration, isLoading: shopifyLoading } =
    useIntegrationByType(IntegratedApps.shopify);

  return (
    <div className="flex flex-col gap-2 mt-4">
      <p className="font-semibold">Product Management</p>

      {/* Import from Shopify */}
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
          <p className="text-sm text-gray-500">
            Curated collections synced from your Meta Catalog
          </p>
        </div>
        <RateupButtonBlue
          leftIcon={<IconRefresh size={16} />}
          onClick={() => syncProductSetsMut.mutate(catalogId)}
          loading={syncProductSetsMut.isPending}
          title="Sync from Meta"
          w="fit-content"
        />
      </div>

      {isLoading ? (
        <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
      ) : productSets && productSets.length > 0 ? (
        <div className="flex flex-col gap-3 mt-2">
          {productSets.map((set: any) => (
            <div
              key={set.productSetId}
              className="flex justify-between items-center p-3 border border-gray-300 rounded-lg bg-gray-50"
            >
              <div className="flex flex-col gap-1">
                <p className="font-medium text-sm">{set.name}</p>
                <p className="text-xs text-gray-500">ID: {set.productSetId}</p>
              </div>
              <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">
                {set.productIds?.length || 0} Products
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500 italic">
          No product sets synced yet.
        </p>
      )}
    </div>
  );
};

export default CatalogSettings;
