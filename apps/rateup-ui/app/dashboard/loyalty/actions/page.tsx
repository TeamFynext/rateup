"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

import { Group, SimpleGrid, Stack } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { LoyaltyActionType } from "@/types/enums";
import { useGetLoyaltyActions } from "@/backend/loyalty/actions/actions.query";
import { useSubscription } from "@/backend/subscription/subscription.query";
import ErrorComponent from "@/components/404/ErrorComponent";
import { RateupButtonBlue } from "@/components/Button/RateupButtons";
import { ContainedSelection } from "@/components/input/ContainedInput/ContainedInput";
import RateupLoader from "@/components/Loaders/RateupLoader";
import LoyaltyActionCard from "@/components/LoyaltyComponents/Action/LoyaltyActionCard";
import NothingFound from "@/components/NothingFound/NothingFound";

const index = () => {
  const translations = useTranslations();
  const {
    data: subscription,
    isLoading: isSubscriptionLoading,
    refetch,
  } = useSubscription();

  const router = useRouter();
  const { data: loyaltyActions, isLoading } = useGetLoyaltyActions();
  const [selectedAction, setSelectedAction] = useState("All Actions");

  const actionFilterData = ["All Actions", ...Object.values(LoyaltyActionType)];

  const filteredLoyaltyActions =
    selectedAction === "All Actions"
      ? loyaltyActions
      : loyaltyActions?.filter((action) => action?.type === selectedAction);

  if (isLoading || isSubscriptionLoading) return <RateupLoader />;

  if (
    !subscription?.features?.loyalty?.active ||
    !subscription?.features?.loyalty?.action?.active
  )
    return <ErrorComponent refetch={refetch} />;

  return (
    <Stack p={"xs"}>
      <Group justify="space-between">
        <Group>
          <RateupButtonBlue
            title={translations("New Action")}
            rightIcon={<IconPlus />}
            onClick={() => {
              router.push("/dashboard/loyalty/actions/create");
            }}
          />
        </Group>
        <ContainedSelection
          data={actionFilterData}
          onChange={setSelectedAction}
          value={selectedAction}
        />
      </Group>
      {isLoading ? (
        <RateupLoader />
      ) : filteredLoyaltyActions?.length ? (
        <SimpleGrid cols={3}>
          {filteredLoyaltyActions?.map((action) => (
            <LoyaltyActionCard action={action} key={action?.id} />
          ))}
        </SimpleGrid>
      ) : (
        <NothingFound text={translations("No action found")} />
      )}
    </Stack>
  );
};

export default index;
