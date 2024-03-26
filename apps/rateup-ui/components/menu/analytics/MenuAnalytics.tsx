import React from "react";
import PaperLayout from "../../styled/Layouts/PaperLayout";
import { Stack, Group, Badge, Text, RingProgress } from "@mantine/core";
import Heading from "../../styled/Heading/Heading";
import { useGetSurveyStatsBySurveyTeamMapId } from "../../../backend/surveys/surveys.query";
import RateupLoader from "../../Loaders/RateupLoader";
import { RateupButtonPrimary } from "../../Button/RateupButtons";
import Link from "next/link";

const MenuAnalytics = ({
  surveyTeamMapId,
  visited,
  surveyId,
  subscription,
}) => {
  const {
    data: survayStats,
    isPending,
    error,
  } = useGetSurveyStatsBySurveyTeamMapId(surveyTeamMapId);
  if (isPending && !!surveyTeamMapId) return <RateupLoader />;

  const surveyStatsCountArray = [
    {
      label: "Visited",
      count: survayStats?.visited ?? 0,
    },
    {
      label: "Started",
      count: survayStats?.started ?? 0,
    },
    {
      label: "Completed",
      count: survayStats?.completed ?? 0,
    },
  ];
  return (
    <Stack px="lg" py={"lg"}>
      <Stack gap={0}>
        <Heading subtitle="Menu Insights" />
        <PaperLayout w={300} h={120} mb={"xl"} mt={"sm"} ml={"xs"}>
          <Stack align={"center"} justify="center" h={"100%"}>
            <Text fz={"30px"} fw="700" c={"var(--tertiary-color)"}>
              {visited ?? 0} visited
            </Text>
          </Stack>
        </PaperLayout>
        {!subscription && (
          <>
            <Heading subtitle="Your Free Quota" />
            <RingProgress
              sections={[
                { value: visited ?? 0, color: "var(--tertiary-color)" },
              ]}
              label={
                <Text c="var(--tertiary-color)" fw={700} ta="center" size="sm">
                  {((visited ?? 0) / 100) * 100}% Used
                </Text>
              }
            />
          </>
        )}
        {surveyTeamMapId && (
          <>
            <Group w={"100%"} justify="space-between" my={"md"}>
              <Heading subtitle="Survey Insights" />
              <Link
                href={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/dashboard/surveys/${surveyId}?tab=Result`}
              >
                <RateupButtonPrimary title="More Info" />
              </Link>
            </Group>
            <Group justify="space-between">
              {surveyStatsCountArray?.map(({ count, label }) => (
                <PaperLayout style={{ flex: 1 }} key={label}>
                  <Stack align={"center"}>
                    <Text fs={"20px"} fw="900" size={"30px"}>
                      {count}
                    </Text>
                    <Badge color="blue" variant="light">
                      {label}
                    </Badge>
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
