"use client";

import { Stack, Text } from "@mantine/core";
import { IconReload } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { RateupButtonSecondary } from "../../Button/RateupButtons";

export function SurveysPageError({ refetch }) {
  const translations = useTranslations();
  return (
    <Stack>
      <Text>{translations("An error occurred!")}</Text>
      <RateupButtonSecondary
        size="md"
        leftIcon={<IconReload />}
        title={translations("Try again")}
        onClick={refetch}
      />
    </Stack>
  );
}
