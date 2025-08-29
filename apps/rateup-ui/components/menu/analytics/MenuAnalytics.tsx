"use client";

import React from "react";
import Link from "next/link";

import { Badge, Group, RingProgress, Stack, Text } from "@mantine/core";
import { useTranslations } from "next-intl";

import { useGetSurveyStatsBySurveyTeamMapId } from "../../../backend/surveys/surveys.query";
import { RateupButtonPrimary } from "../../Button/RateupButtons";
import RateupLoader from "../../Loaders/RateupLoader";
import Heading from "../../styled/Heading/Heading";
import PaperLayout from "../../styled/Layouts/PaperLayout";

const MenuAnalytics = ({
  surveyTeamMapId,
  visited,
  surveyId,
  subscription,
}) => {
  const translations = useTranslations();
  const {
    data: survayStats,
    isPending,
    error,
  } = useGetSurveyStatsBySurveyTeamMapId(surveyTeamMapId);
  if (isPending && !!surveyTeamMapId) return <RateupLoader />;

  const surveyStatsCountArray = [
    {
      label: translations("Visited"),
      count: survayStats?.visited ?? 0,
    },
    {
      label: translations("Started"),
      count: survayStats?.started ?? 0,
    },
    {
      label: translations("Completed"),
      count: survayStats?.completed ?? 0,
    },
  ];
  return (
    <Stack px="lg" py={"lg"}>
      <Stack gap={0}>
        <Heading subtitle={translations("Menu Insights")} />
        <PaperLayout w={300} h={120} mb={"xl"} mt={"sm"} ml={"xs"}>
          <Stack align={"center"} justify="center" h={"100%"}>
            <Text
              fz={"30px"}
              fw="700"
              c={"var(--mantine-primary-color-filled)"}
            >
              {visited ?? 0} visited
            </Text>
          </Stack>
        </PaperLayout>
        {!subscription && (
          <>
            <Heading subtitle={translations("Your Free Quota")} />
            <RingProgress
              sections={[
                {
                  value: visited ?? 0,
                  color: "var(--mantine-primary-color-filled)",
                },
              ]}
              label={
                <Text
                  c="var(--mantine-primary-color-filled)"
                  fw={500}
                  ta="center"
                  size="sm"
                >
                  {Math.round(((visited ?? 0) / 100) * 100)}% Used
                </Text>
              }
            />
          </>
        )}
        {surveyTeamMapId && (
          <>
            <Group w={"100%"} justify="space-between" my={"md"}>
              <Heading subtitle={translations("Survey Insights")} />
              <Link
                href={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/dashboard/surveys/${surveyId}?tab=Result`}
              >
                <RateupButtonPrimary title={translations("More Info")} />
              </Link>
            </Group>
            <Group justify="space-between">
              {surveyStatsCountArray?.map(({ count, label }) => (
                <PaperLayout style={{ flex: 1 }} key={label}>
                  <Stack align={"center"}>
                    <Text fs={"20px"} fw="900" size={"30px"}>
                      {count}
                    </Text>
                    <Badge variant="light">{label}</Badge>
                  </Stack>
                </PaperLayout>
              ))}
            </Group>
          </>
        )}
      </Stack>
    </Stack>
  );
};

export default MenuAnalytics;
