"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  ActionIcon,
  Badge,
  Card,
  Flex,
  Group,
  Image,
  Modal,
  SimpleGrid,
  Skeleton,
  Spoiler,
  Stack,
  Switch,
  Text,
  Title,
} from "@mantine/core";
import { isNotEmpty, useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { IconRefresh } from "@tabler/icons-react";

import { useWaCatalog } from "@/backend/whatsapp/catalog/catalog.query";
import {
  RateupButtonPrimary,
  RateupButtonSecondary,
} from "@/components/Button/RateupButtons";
import { ContainedTextField } from "@/components/input/ContainedInput/ContainedInput";
import RateupLoader from "@/components/Loaders/RateupLoader";

const Catalog = () => {
  const [opened, { open, close }] = useDisclosure(false);
  return (
    <Stack p={"xs"}>
      <Flex justify={"space-between"}>
        <Title order={4}>Catalogs</Title>
        <RateupButtonPrimary
          title="Sync Catalogs"
          onClick={open}
          leftIcon={<IconRefresh size={16} />}
        />
      </Flex>
      <WaCatalogList />
      <SycnWaCatalogsModal opened={opened} close={close} />
    </Stack>
  );
};

const WaCatalogList = () => {
  const { allCatalogs } = useWaCatalog();
  const router = useRouter();
  const { data: catalogs, isPending } = allCatalogs;
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
            <Text>{catalog.name}</Text>
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
const SycnWaCatalogsModal = ({ opened, close }) => {
  const { sync } = useWaCatalog();
  const form = useForm({
    initialValues: {
      businessId: "",
    },
    validate: {
      businessId: isNotEmpty("Required"),
    },
  });
  function handleSync() {
    if (form.validate().hasErrors) return;
    sync.mutate(form.values.businessId, {
      onSettled: () => {
        form.reset(), close();
      },
    });
  }
  return (
    <Modal opened={opened} onClose={close} centered title="Sync catalogs">
      <Stack>
        <ContainedTextField
          label={"Meta Business ID"}
          {...form.getInputProps("businessId")}
          placeholder="Enter"
        />
        <Group justify="flex-end">
          <RateupButtonSecondary
            title="Cancel"
            onClick={() => {
              form.reset();
              close();
            }}
            variant="light"
          />
          <RateupButtonPrimary
            title="Sync"
            loading={sync.isPending}
            onClick={handleSync}
          />
        </Group>
      </Stack>
    </Modal>
  );
};

export default Catalog;
