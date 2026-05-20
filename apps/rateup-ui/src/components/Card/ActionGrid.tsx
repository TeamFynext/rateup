"use client";

import { Avatar, Group, SimpleGrid, Text, Title } from "@mantine/core";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { IntegratedApps } from "@/types/enums.ts";
import { getIntegrationDisplayName } from "@/utils/integration.ts";

import PaperLayout from "../styled/Layouts/PaperLayout.tsx";
import classes from "./ActionGrid.module.css";

export function ActionsGrid({ getAppIconImageUrl }) {
  const navigate = useNavigate();
  const { t: translations } = useTranslation();
  const items = Object.entries(IntegratedApps).map(([key, value]) => {
    const { src } = getAppIconImageUrl(value);
    return (
      <PaperLayout
        hoveractive
        key={value}
        className={classes.item}
        onClick={() =>
          navigate({
            to: `/dashboard/apps&services/${key}`,
          })
        }
        bg={
          "light-dark(var(--mantine-color-gray-0), var(--mantine-color-body))"
        }
      >
        <Avatar name={value} color="initials" radius={0} src={src} size={30} />
        <Text size="xs" mt={7} fz={"sm"}>
          {getIntegrationDisplayName(value)}
        </Text>
      </PaperLayout>
    );
  });

  return (
    <PaperLayout className={classes.card}>
      <Group justify="space-between">
        <Title order={4}>{translations("Apps")}</Title>
      </Group>
      <SimpleGrid cols={4} mt="md">
        {items}
      </SimpleGrid>
    </PaperLayout>
  );
}
