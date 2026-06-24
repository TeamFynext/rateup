import {
  Avatar,
  Badge,
  Checkbox,
  Flex,
  Group,
  Loader,
  Paper,
  SimpleGrid,
  Space,
  Text,
} from "@mantine/core";
import { IconChartBar } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { JSX } from "react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useSurveys } from "@/backend/surveys/surveys.query";
import { getTimeSince } from "@/utils/index.ts";

function SurveyCardList({ getSelectedSurveys, LandingPage }) {
  const [surveyidArray, setSurveyIdArray] = useState([]);

  const { isLoading, error, data: surveys } = useSurveys();
  const queryClient = useQueryClient();
  const { t: translations } = useTranslation();
  useEffect(() => {
    // -----------callback function to get selected surveys to parent -------
    getSelectedSurveys(surveyidArray);
  }, [surveyidArray?.length, queryClient]);
  // --------if survey ids array then set----------
  useEffect(() => {
    if (LandingPage?.surveys?.length) {
      setSurveyIdArray(LandingPage?.surveys);
    }
    queryClient.invalidateQueries({ queryKey: ["surveys"] });
  }, [LandingPage?.surveys?.length]);

  if (isLoading)
    return (
      <>
        <Loader type="bars" />
      </>
    );
  if (error || !Array.isArray(surveys)) {
    console.error(surveys, error);
    return <> {translations("An error has occurred")}</>;
  }

  // --------handle check box click ----------

  const handleCheckBox = (e, surveyid, _checked) => {
    e.stopPropagation();
    if (surveyidArray.length >= 4 && e.target.checked) {
      toast.warning(translations("Max 4 surveys can be merged."), {
        id: "survey-merge-max",
      });
      return;
    }
    if (surveyidArray.includes(surveyid)) {
      setSurveyIdArray(surveyidArray.filter((id) => id !== surveyid));
    } else {
      setSurveyIdArray([...surveyidArray, surveyid]);
    }
  };
  // --------------check if survey is selected------
  const isChecked = (surveyid) => {
    const surveysarray = surveyidArray;
    let found = false;
    for (let i = 0; i < surveysarray.length; i++) {
      if (surveyid == surveysarray[i]) {
        found = true;
        break;
      }
    }
    return found;
  };
  return (
    <>
      <Flex style={{ flexDirection: "column", width: "100%" }}>
        <SimpleGrid cols={{ base: 2, sm: 1, md: 2, lg: 5, xl: 2 }} spacing={"lg"}>
          {surveys.map((s) => {
            if (s.type == "web")
              return (
                <SurveyCard
                  key={s.id}
                  survey={s}
                  handleCheckBox={handleCheckBox}
                  isChecked={isChecked}
                />
              );
          })}
        </SimpleGrid>
      </Flex>
    </>
  );
}

interface SurveyCardProps {
  survey: Survey;
  handleCheckBox: any;
  isChecked: any;
}
function SurveyCard({ survey, handleCheckBox, isChecked }: SurveyCardProps & {}): JSX.Element {
  const [timeSince, setTimeSince] = useState("");

  useEffect(() => {
    setTimeSince(getTimeSince(survey?.createdAt));
    const timeoutID = setInterval(() => setTimeSince(getTimeSince(survey?.createdAt)), 5000);
    return () => clearInterval(timeoutID);
  }, []);

  const { t: translations } = useTranslation();
  return (
    <>
      <Paper p="md" shadow="lg" withBorder radius="lg" style={{ cursor: "pointer" }}>
        <Flex justify={"space-between"} align={"center"}>
          <Text mr={"sm"} truncate size="xl" fw={500}>
            {survey?.title}
          </Text>
          <Badge color={survey?.type == "web" ? "blue" : "green"}>{survey?.type}</Badge>
          <Group align={"center"} mt="sm" gap="xs">
            <Checkbox
              onClick={(e) => {
                handleCheckBox(e, survey?.id);
              }}
              checked={isChecked(survey?.id)}
            ></Checkbox>
          </Group>
        </Flex>
        <Group align={"center"} mt="sm" gap="xs">
          <Avatar radius={"xl"} />
          <Text size="sm" c="dimmed">
            {translations("Created ")}
            {timeSince}
          </Text>
        </Group>
        <Space h="xl" />
        <Space h="lg" />

        <Flex justify={"space-between"} mt="xl" align={"center"}>
          <StatusBadge active={survey?.active} />

          <Link
            to={`/dashboard/surveys/${survey?.id}?tab=Responses`}
            style={{ color: "var(--tertiary-color)" }}
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <Group gap="4px">
              <IconChartBar size={20} />
              <Text>{translations("Responses")}</Text>
            </Group>
          </Link>
        </Flex>
      </Paper>
    </>
  );
}

export function StatusBadge({ active }) {
  return (
    <>
      <Badge color={active ? "green" : "yellow"}>{active ? "Active" : "Paused"}</Badge>
    </>
  );
}
