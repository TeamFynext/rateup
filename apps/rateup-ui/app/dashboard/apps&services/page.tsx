"use client";

import { useRouter } from "next/navigation";

import { Group, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { IconApi, IconCloudLock } from "@tabler/icons-react";
import PaperLayout from "components/styled/Layouts/PaperLayout";
import { IntegratedApps } from "types/enums";

import { ActionsGrid } from "@/components/Card/ActionGrid";

const WaPayment = () => {
  const router = useRouter();

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
    }
  }

  return (
    <Stack p={"xl"}>
      <ActionsGrid getAppIconImageUrl={getAppIconImageUrl} />
      <PaperLayout>
        <Title order={4}>Services</Title>
        <SimpleGrid cols={3} p={"xl"} spacing={"xl"}>
          <PaperLayout
            onClick={() => router.push("/dashboard/apps&services/encryption")}
            hoveractive
          >
            <Group>
              <IconCloudLock color="gray" />
              <Text>End-to-End Enryption</Text>
            </Group>
          </PaperLayout>
          <PaperLayout
            onClick={() => router.push("/dashboard/apps&services/apiservice")}
            hoveractive
          >
            <Group>
              <IconApi color="gray" />
              <Text>API Service</Text>
            </Group>
          </PaperLayout>
        </SimpleGrid>
      </PaperLayout>
    </Stack>
  );
};

export default WaPayment;
