"use client";

import { Group, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { IconApi, IconCloudLock, IconFidgetSpinner } from "@tabler/icons-react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { IntegratedApps } from "@/types/enums.ts";
import { ActionsGrid } from "@/components/Card/ActionGrid.tsx";
import PaperLayout from "@/components/styled/Layouts/PaperLayout.tsx";

export const Route = createFileRoute("/dashboard/apps&services/")({
  component: WaPayment,
});

function getAppIconImageUrl(app) {
  switch (app) {
    case IntegratedApps.shopify:
      return {
        src: "/images/shopifyicon.png",
      };
    case IntegratedApps.googlesheet:
      return {
        src: "/images/googlesheeticon.png",
      };
    case IntegratedApps.amelia:
      return {
        src: "/images/amelia.png",
      };
    case IntegratedApps.waPayment:
      return {
        src: "/images/whatsapp.png",
      };
    case IntegratedApps.petpooja:
      return {
        src: "/images/petpooja.png",
      };
    case IntegratedApps.zapier:
      return {
        src: "/images/zapier.png",
      };
    case IntegratedApps.zoho:
      return {
        src: "/images/zoho.png",
      };
  }
}

function WaPayment() {
  const navigate = useNavigate();

  return (
    <Stack p={"xl"}>
      <ActionsGrid getAppIconImageUrl={getAppIconImageUrl} />
      <PaperLayout>
        <Title order={4}>Services</Title>
        <SimpleGrid cols={3} p={"xl"} spacing={"xl"}>
          <PaperLayout
            onClick={() =>
              navigate({
                to: "/dashboard/apps&services/encryption",
              })
            }
            hoveractive
          >
            <Group>
              <IconCloudLock color="gray" />
              <Text>End-to-End Enryption</Text>
            </Group>
          </PaperLayout>
          <PaperLayout
            onClick={() =>
              navigate({
                to: "/dashboard/apps&services/apiservice",
              })
            }
            hoveractive
          >
            <Group>
              <IconApi color="gray" />
              <Text>API Service</Text>
            </Group>
          </PaperLayout>
          <PaperLayout
            onClick={() =>
              navigate({
                to: "/dashboard/apps&services/widget",
              })
            }
            hoveractive
          >
            <Group>
              <IconFidgetSpinner color="gray" />
              <Text>Widget</Text>
            </Group>
          </PaperLayout>
        </SimpleGrid>
      </PaperLayout>
    </Stack>
  );
}
