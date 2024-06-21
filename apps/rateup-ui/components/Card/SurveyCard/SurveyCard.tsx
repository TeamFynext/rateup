import { Badge, Group, Stack, Text, Tooltip } from "@mantine/core";
import { IconChartBar } from "@tabler/icons-react";
import router from "next/router";
import { RateupButtonSecondary } from "../../Button/RateupButtons";
import CreatedSinceText from "../../CreatedSinceText";
import PaperLayout from "../../styled/Layouts/PaperLayout";
import { SurveyMenu } from "./SurveyMenu";

interface SurveyCardProps {
  survey: Survey;
  handleCheckBox: any;
  isChecked: any;
  selectedTeamId: string;
  teamsData: any;
  route?: string;
  refetchSurveys: any;
}
/**
 * The SurveyCard component used to display a survey in the surveys page (dashboard/surveys)
 */
export function SurveyCard({
  survey,
  handleCheckBox,
  isChecked,
  selectedTeamId,
  teamsData,
  route,
  refetchSurveys,
}: SurveyCardProps): JSX.Element {
  return (
    <PaperLayout
      hoveractive
      p="md"
      shadow="lg"
      radius="lg"
      style={{ cursor: "pointer" }}
      onClick={(e) => {
        e.stopPropagation();
        router.push(
          route ||
            `${router.pathname}/${survey?.id}${
              survey?.isPublished ? `?tab=Result` : ""
            }`,
        );
      }}
    >
      <Stack justify="space-between" h={"100%"}>
        <Group justify={"space-between"} align={"center"} wrap="nowrap">
          <Tooltip label={survey?.title}>
            <Text
              style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}
              truncate="end"
              size="xl"
              fw={700}
            >
              {survey?.title}
            </Text>
          </Tooltip>
          <Group align={"center"} gap="xs">
            <SurveyMenu
              survey={survey}
              selectedTeamId={selectedTeamId}
              teamsData={teamsData}
              refetchSurveys={refetchSurveys}
            />
          </Group>
        </Group>

        <CreatedSinceText createdAt={survey?.createdAt} />

        <Group justify="space-between">
          <Group>
            <StatusBadge active={survey?.active} />
            <Badge
              variant="outline"
              color={survey?.type == "web" ? "blue" : "#149a8a"}
            >
              {survey?.type}
            </Badge>
          </Group>
          <Group justify={"space-between"} align={"center"}>
            <PaperLayout
              p={0}
              radius={5}
              onClick={(e) => {
                e.stopPropagation();
                router.push(`${router.pathname}/${survey?.id}?tab=Result`);
              }}
              style={{ overflow: "hidden" }}
            >
              <RateupButtonSecondary
                leftIcon={<IconChartBar size={15} />}
                title="Responses"
                variant="subtle"
                size="xs"
                radius={5}
                fullWidth
              />
            </PaperLayout>
          </Group>
        </Group>
      </Stack>
    </PaperLayout>
  );
}

function StatusBadge({ active }) {
  return (
    <Badge color={active ? "green" : "yellow"} variant="light">
      {active ? "Active" : "Paused"}
    </Badge>
  );
}
