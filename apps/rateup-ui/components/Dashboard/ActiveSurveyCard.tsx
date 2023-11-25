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
        e.stopPropagation(),
          router.push(
            `${process.env.NEXT_PUBLIC_FRONTEND_URL}/dashboard/surveys/${survey?.id}?tab=Result`,
          );
      }}
    >
      <Stack h={"100%"} gap={0}>
        <Group justify={"space-between"} pt={"md"} pr={"md"} pl={"md"}>
          <Text mr={"sm"} truncate size="xl" fw={700} maw={150}>
            {survey?.title}
          </Text>
          <Badge color={survey?.type == "web" ? "blue" : "green"}>
            {survey?.type}
          </Badge>
        </Group>
        <Group justify="space-between" px="lg" align="center" py={"sm"}>
          {[
            { title: "Responses", value: responsesCount ? responsesCount : 0 },
            { title: "Visited", value: visitedCount ? visitedCount : 0 },
          ].map(({ title, value }) => (
            <Stack style={{ flex: 1 }}>
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
                fw={700}
                fz="lg"
                c="#595959"
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
