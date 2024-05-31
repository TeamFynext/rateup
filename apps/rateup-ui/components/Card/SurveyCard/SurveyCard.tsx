import {
  Stack,
  Group,
  Avatar,
  Badge,
  Text,
  Button,
  Tooltip,
} from "@mantine/core";
import { IconChartBar } from "@tabler/icons-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { getTimeSince } from "../../../utils";
import PaperLayout from "../../styled/Layouts/PaperLayout";
import { SurveyMenu } from "./SurveyMenu";
import router from "next/router";
import { RateupButtonSecondary } from "../../Button/RateupButtons";

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
  const [timeSince, setTimeSince] = useState("");
  useEffect(() => {
    if (survey?.createdAt) {
      setTimeSince(getTimeSince(new Date(survey?.createdAt).toString()));
      const timeoutID = setInterval(
        () =>
          setTimeSince(getTimeSince(new Date(survey?.createdAt).toString())),
        5000,
      );
      return () => clearInterval(timeoutID);
    }
  }, []);

  return (
    <PaperLayout
      hoveractive
      mah={200}
      mih={200}
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
        <Group justify={"space-between"} align={"center"}>
          <Tooltip label={survey?.title}>
            <Text style={{ maxWidth: "70%" }} truncate="end" size="xl" fw={700}>
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
            {/* <Checkbox
              onClick={(e) => {
                handleCheckBox(e, survey?.id);
              }}
            ></Checkbox> */}
          </Group>
        </Group>
        <Group gap="xs">
          <Avatar radius={"xl"} />
          <Text size="sm" c="dimmed">
            Created {timeSince}
          </Text>
        </Group>
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
            {/* <Text>Total Responses : #</Text> */}
            {/* //TODO */}
            <PaperLayout
              p={0}
              radius={5}
              onClick={(e) => {
                e.stopPropagation();
                router.push(`${router.pathname}/${survey?.id}?tab=Result`);
              }}
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
