import React from "react";
import { Text, Title, Badge, Group, Stack } from "@mantine/core";
import { useRouter } from "next/router";
import { RateupButtonBlue } from "../Button/RateupButtons";
import PaperLayout from "../styled/Layouts/PaperLayout";
interface SurveyCardProps {
  survey: SurveySummary;
}
export default function ActiveSurveyCard({
  survey,
}: SurveyCardProps): JSX.Element {
  const responsesCount = survey?.teams
    ?.map((team) => team.responses?.length)
    ?.reduce((a, b) => a + b, 0);
  const visitedCount = survey?.teams
    ?.map((team) => team.surveyStats?.visited ?? 0)
    ?.reduce((a, b) => a + b, 0);
  const router = useRouter();
  return (
    <PaperLayout
      hoveractive
      mah={250}
      p={0}
      style={{
        cursor: "pointer",
        minWidth: "280px",
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (survey?.type === "waFlow") {
          survey?.WaFlow?.dbFlowId &&
            router.push(
              `${process.env.NEXT_PUBLIC_FRONTEND_URL}/dashboard/whatsapp/flows/${survey?.WaFlow?.dbFlowId}?tab=Result`,
            );
        } else {
          router.push(
            `${process.env.NEXT_PUBLIC_FRONTEND_URL}/dashboard/surveys/${survey?.id}?tab=Result`,
          );
        }
      }}
    >
      <Stack h={"100%"} gap={0}>
        <Stack justify={"space-between"} pt={"md"} pr={"md"} pl={"md"} gap={10}>
          <Text mr={"sm"} truncate size="xl" fw={700} maw={"100%"}>
            {survey?.title}
          </Text>
          <Badge
            color={survey?.type == "web" ? "blue" : "#149a8a"}
            variant="outline"
          >
            {survey?.type}
          </Badge>
        </Stack>
        <Group justify="space-between" px="lg" align="center" py={"sm"}>
          {[
            { title: "Responses", value: responsesCount ? responsesCount : 0 },
            { title: "Visited", value: visitedCount ? visitedCount : 0 },
          ].map(({ title, value }, index) => (
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
        <RateupButtonBlue
          title={"View"}
          size="lg"
          styles={{
            root: {
              borderRadius: "0 0 10px 10px",
            },
          }}
        />
      </Stack>
    </PaperLayout>
  );
}
