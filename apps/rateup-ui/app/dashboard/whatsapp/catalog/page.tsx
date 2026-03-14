"use client";

import React, { useMemo } from "react";
import { useRouter } from "next/navigation";

import {
  Badge,
  Card,
  Flex,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconRefresh } from "@tabler/icons-react";

import {
  useAllWaCatalogs,
  useSyncCatalogs,
} from "@/backend/whatsapp/catalog/catalog.query";
import InfoButton from "@/components/Button/InfoButton";
import { RateupButtonPrimary } from "@/components/Button/RateupButtons";
import RateupLoader from "@/components/Loaders/RateupLoader";
import { docsPath } from "@/utils/constants";

const Catalog = () => {
  const sync = useSyncCatalogs();
  return (
    <Stack p={"xs"}>
      <Flex justify={"space-between"}>
        <Flex align="center" gap="xs">
          <Title order={4}>Catalogs</Title>
          <InfoButton docUrl={`${docsPath}/whatsapp/catalogs`} />
        </Flex>

        <RateupButtonPrimary
          title="Sync Catalogs"
          onClick={() => sync.mutate()}
          leftIcon={<IconRefresh size={16} />}
          loading={sync.isPending}
        />
      </Flex>
      <WaCatalogList />
    </Stack>
  );
};

const WaCatalogList = () => {
  const router = useRouter();
  const { data: catalogs, isPending } = useAllWaCatalogs();
  const catalogList = useMemo(() => catalogs ?? [], [catalogs]);
  if (isPending) return <RateupLoader />;
  return (
    <SimpleGrid cols={{ base: 2, sm: 1, md: 2, lg: 4, xl: 4 }}>
      {catalogList.map((catalog) => (
        <Card
          key={catalog?.catalogId}
          withBorder
          shadow="sm"
          radius={"md"}
          style={{ cursor: "pointer" }}
          onClick={() =>
            router.push(`/dashboard/whatsapp/catalog/${catalog.catalogId}`)
          }
        >
          <Stack>
            <Group justify="space-between" align="flex-start">
              <Text fw={500}>{catalog.name}</Text>
              {catalog.connectedWaPhoneIds &&
                catalog.connectedWaPhoneIds.length > 0 && (
                  <Badge color="green" variant="filled" size="xs">
                    Linked to WhatsApp
                  </Badge>
                )}
            </Group>
            <Group justify="space-between">
              <Text c={"dimmed"} size="sm">
                ID: {catalog.catalogId}
              </Text>
              <Badge variant="light">{catalog.vertical}</Badge>
            </Group>
          </Stack>
        </Card>
      ))}
    </SimpleGrid>
  );
};

export default Catalog;
