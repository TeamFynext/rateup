"use client";

import React from "react";

import { Group, Loader, Stack } from "@mantine/core";

import { useWaCatalog } from "@/backend/whatsapp/catalog/catalog.query";
import {
  ContainedSwitchInput,
  ContainedTextField,
} from "@/components/input/ContainedInput/ContainedInput";

const CatalogSettings = ({ catalogData }) => {
  const { update } = useWaCatalog(catalogData?.catalogId);
  function handleSwitch(checked) {
    update.mutate({ isWhatsappConnected: checked });
  }
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
      <Group>
        <ContainedSwitchInput
          checked={catalogData.isWhatsappConnected}
          label={"Connect to WhatsApp"}
          onChange={(e) => handleSwitch(e.currentTarget.checked)}
        />
        {update.isPending && <Loader size={"sm"} />}
      </Group>
    </Stack>
  );
};

export default CatalogSettings;
