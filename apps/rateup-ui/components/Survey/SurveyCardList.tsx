import {
  Paper,
  Title,
  Text,
  Stack,
  SimpleGrid,
  Flex,
  Menu,
  Avatar,
  Badge,
  ActionIcon,
  useMantineTheme,
  Group,
  Loader,
  Space,
  Select,
  Modal,
  Checkbox,
  Button,
} from "@mantine/core";
import { IconChartBar } from "@tabler/icons-react";

import Link from "next/link";
import { useDisclosure } from "@mantine/hooks";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { notifications } from "@mantine/notifications";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  RateupButtonPrimary,
  RateupButtonSecondary,
} from "../Button/RateupButtons";
import { useUser } from "../../context/UserContext";
import {
  useCloneSurveyMutation,
  useSurveys,
  useSurveysByTeam,
} from "../../backend/surveys/surveys.query";
import { useTeamsByUser } from "../../backend/team/team.query";
import { CreateSurveyModal } from "./CreateSurveyModal";
import CreateSurveyLandingModal from "../../pages/dashboard/LandingPages/CreateSurveyLandingModal";
import { getTimeSince } from "../../utils";
import { deleteSurvey, updateSurvey } from "../../backend/surveys/survey.api";

export default function SurveyCardList({ getSelectedSurveys, LandingPage }) {
  const [surveyidArray, setSurveyIdArray] = useState([]);

  const { isLoading, error, data: surveys } = useSurveys(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    //-----------callback function to get selected surveys to parent -------
    getSelectedSurveys(surveyidArray);
  }, [surveyidArray?.length, queryClient]);
  //--------if survey ids array then set----------
  useEffect(() => {
    if (LandingPage?.surveys?.length) {
      setSurveyIdArray(LandingPage?.surveys);
    }
    queryClient.invalidateQueries(["surveys"]);
  }, [LandingPage?.surveys?.length]);

  if (isLoading)
    return (
      <>
        <Loader />
      </>
    );
  if (error || !Array.isArray(surveys)) {
    console.error(surveys, error);
    return <>"An error has occurred"</>;
  }

  //--------handle check box click ----------

  const handleCheckBox = (e, surveyid, checked) => {
    e.stopPropagation();
    if (surveyidArray.length >= 4 && e.target.checked) {
      notifications.show({
        id: "survey-merge-max",

        title: "Limit exceed",
        message: "Max 4 surveys can be merged.",

        autoClose: 2000,
      });
      return;
    }
    if (surveyidArray.includes(surveyid)) {
      setSurveyIdArray(surveyidArray.filter((id) => id !== surveyid));
    } else {
      setSurveyIdArray([...surveyidArray, surveyid]);
    }
  };
  //--------------check if survey is selected------
  const isChecked = (surveyid) => {
    let surveysarray = surveyidArray;
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
        <SimpleGrid
          cols={{ base: 2, sm: 1, md: 2, lg: 5, xl: 2 }}
          spacing={"lg"}
        >
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
function SurveyCard({
  survey,
  handleCheckBox,
  isChecked,
}: SurveyCardProps & {}): JSX.Element {
  const theme = useMantineTheme();
  const [timeSince, setTimeSince] = useState("");
  const { user, setUser } = useUser();
  useEffect(() => {
    setTimeSince(getTimeSince(survey.createdAt));
    const timeoutID = setInterval(
      () => setTimeSince(getTimeSince(survey.createdAt)),
      5000,
    );
    return () => clearInterval(timeoutID);
  }, []);

  const router = useRouter();

  return (
    <>
      <Paper
        p="md"
        shadow="lg"
        withBorder
        radius="lg"
        style={{ cursor: "pointer" }}
      >
        <Flex justify={"space-between"} align={"center"}>
          <Text mr={"sm"} truncate size="xl" fw={700}>
            {survey.title}
          </Text>
          <Badge color={survey?.type == "web" ? "blue" : "green"}>
            {survey.type}
          </Badge>
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
            Created {timeSince}
          </Text>
        </Group>
        <Space h="xl" />
        <Space h="lg" />

        <Flex justify={"space-between"} mt="xl" align={"center"}>
          <StatusBadge active={survey.active} />

          <Link
            href={`/dashboard/surveys/${survey.id}?tab=Responses`}
            style={{ color: "var(--tertiary-color)" }}
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <Group gap="4px">
              <IconChartBar size={20} />
              <Text>Responses</Text>
            </Group>
          </Link>
        </Flex>
      </Paper>
    </>
  );
}

function StatusBadge({ active }) {
  return (
    <>
      <Badge color={active ? "green" : "yellow"}>
        {active ? "Active" : "Paused"}
      </Badge>
    </>
  );
}
