"use client";

import React from "react";
import { useRouter } from "next/navigation";

import { Badge, Center, Group, Stack, Text } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";

import { useLoyaltyApiSettings } from "@/backend/loyalty/apiSettings/apiSettings.query";
import ErrorComponent from "@/components/404/ErrorComponent";
import { RateupButtonPrimary } from "@/components/Button/RateupButtons";
import { SurveyCardLayout } from "@/components/Card/SurveyCard/SurveyCardLayout";
import RateupLoader from "@/components/Loaders/RateupLoader";
import NothingFound from "@/components/NothingFound/NothingFound";
import PaperLayout from "@/components/styled/Layouts/PaperLayout";

import { ActiveStatusBadge } from "../../apps&services/shopify/page";

const LoyaltyAPI = () => {
  const router = useRouter();
  return (
    <Stack p={"xs"}>
      <Group justify="space-between">
        <RateupButtonPrimary
          title="Create API"
          rightIcon={<IconPlus size={16} />}
          onClick={() => router.push("/dashboard/loyalty/api/create")}
        />
      </Group>
      <LoyaltyApiList />
    </Stack>
  );
};

const LoyaltyApiList = () => {
  const { getAll } = useLoyaltyApiSettings();
  const { data, isLoading, error, refetch, isRefetching } = getAll;

  if (isLoading) return <RateupLoader />;
  if (error)
    return <ErrorComponent refetch={refetch} isRefetching={isRefetching} />;
  if (!data.length) return <NothingFound text="No API settings found" />;
  return (
    <SurveyCardLayout>
      {data.map((apiSetting) => (
        <LoyaltyApiSettingCard apiSetting={apiSetting} key={apiSetting.id} />
      ))}
    </SurveyCardLayout>
  );
};

const LoyaltyApiSettingCard = ({
  apiSetting,
}: {
  apiSetting: LoyaltyApiSetting;
}) => {
  const router = useRouter();
  return (
    <PaperLayout
      onClick={() => router.push(`/dashboard/loyalty/api/${apiSetting.id}`)}
    >
      <Stack>
        <Group justify="space-between">
          <Text>{apiSetting[apiSetting.feature]?.name}</Text>
          <Badge variant="light">Priority: {apiSetting.priority}</Badge>
        </Group>
        <Group justify="space-between">
          <Badge>{apiSetting.feature}</Badge>
          <ActiveStatusBadge active={apiSetting.active} />
        </Group>
      </Stack>
    </PaperLayout>
  );
};

export default LoyaltyAPI;
