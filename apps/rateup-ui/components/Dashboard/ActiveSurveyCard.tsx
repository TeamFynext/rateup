"use client";

import React, { JSX } from "react";
import { useRouter } from "next/navigation";

import { Badge, Group, Stack, Text, Title } from "@mantine/core";
import { useTranslations } from "next-intl";

import { RateupButtonBlue } from "../Button/RateupButtons";
import PaperLayout from "../styled/Layouts/PaperLayout";

interface SurveyCardProps {
  survey: SurveySummary;
}
export default function ActiveSurveyCard({
  survey,
}: SurveyCardProps): JSX.Element {
  const responsesCount = survey?.responseCount;
  const visitedCount = survey?.teams
    ?.map((team) => team.surveyStats?.visited ?? 0)
    ?.reduce((a, b) => a + b, 0);
  const router = useRouter();
  const translations = useTranslations();
  const responsesVisitedValues = [
    {
      title: translations("Responses"),
      value: responsesCount ? responsesCount : 0,
    },
    { title: translations("Visited"), value: visitedCount ? visitedCount : 0 },
  ];

  if (survey?.type === "waFlow") responsesVisitedValues.pop();

  return (
    <PaperLayout
      hoveractive
      mah={250}
      p={0}
      style={{
        cursor: "pointer",
        // minWidth: "280px",
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (survey?.type === "waFlow") {
          survey?.WaFlow?.dbFlowId &&
            router.push(
              `${process.env.NEXT_PUBLIC_FRONTEND_URL}/dashboard/whatsapp/flows/v${survey?.WaFlow?.version ?? 0}/${survey?.WaFlow?.dbFlowId}?tab=Result`,
            );
        } else {
          router.push(
            `${process.env.NEXT_PUBLIC_FRONTEND_URL}/dashboard/surveys/${survey?.id}?tab=Result`,
          );
        }
      }}
    >
      <Stack h={"100%"} gap={0} justify="space-between">
        <Group
          justify={"space-between"}
          pt={"md"}
          pr={"md"}
          pl={"md"}
          gap={"1rem"}
        >
          <Text
            flex={1}
            lineClamp={2}
            style={{ wordBreak: "break-all" }}
            fw={500}
          >
            {survey?.title}
          </Text>

          <Badge
            color={survey?.type == "web" ? "blue" : "#149a8a"}
            variant="outline"
          >
            {survey?.type === "waFlow" ? "WhatsApp" : survey?.type}
          </Badge>
        </Group>
        <Group justify="space-between" px="lg" align="center" py={"sm"}>
          {responsesVisitedValues.map(({ title, value }, index) => (
            <Stack style={{ flex: 1 }} key={index}>
              <Title
                style={{
                  textAlign: "center",
                }}
                order={2}
                size="30px"
                c="#3F5BA9"
              >
                {value}
              </Title>
              <Text
                style={{
                  textAlign: "center",
                }}
                mt="-15px"
                fw={"400"}
                fz="lg"
                c="dimmed"
              >
                {title}
              </Text>
            </Stack>
          ))}
        </Group>
      </Stack>
    </PaperLayout>
  );
}
