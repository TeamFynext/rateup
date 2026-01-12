"use client";

import React, { useEffect, useMemo, useState } from "react";

import { ActionIcon, Group, Loader, Stack, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconCheck, IconLinkPlus, IconLogin2 } from "@tabler/icons-react";

import { MetaLoginAssets, WaConfigType } from "@/types/enums";
import {
  useDisconnectCatalogFromWa,
  useUpateCatalog,
  useWaCatalog,
} from "@/backend/whatsapp/catalog/catalog.query";
import { useWaSettings } from "@/backend/whatsapp/settings/waSettings.query";
import { RateupButtonBlue } from "@/components/Button/RateupButtons";
import {
  ContainedSelection,
  ContainedSwitchInput,
  ContainedTextField,
} from "@/components/input/ContainedInput/ContainedInput";
import RateupLoader from "@/components/Loaders/RateupLoader";
import ConfirmationModal from "@/components/Modal/ConfirmationModal";
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
    <Stack>
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
      <Group justify="space-between">
        <Group>
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
        </Group>
        <RateupButtonBlue
          leftIcon={<IconLogin2 />}
          color="red"
          w={"fit-content"}
          onClick={open}
          title="Disconnect Whatsapp Business Account"
          loading={disconnect.isPending}
        />
      </Group>

      <Text fw={600} mt="md">
        Shopify Checkout Automation
      </Text>
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
    </Stack>
  );
};

export default CatalogSettings;
