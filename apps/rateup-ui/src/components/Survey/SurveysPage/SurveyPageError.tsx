"use client";

import { Stack, Text } from "@mantine/core";
import { IconReload } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { RateupButtonSecondary } from "../../Button/RateupButtons.tsx";

export function SurveysPageError({ refetch }) {
  const { t: translations } = useTranslation();
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
