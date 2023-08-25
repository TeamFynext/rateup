import {
  Center,
  Container,
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
  createStyles,
} from "@mantine/core";
import {
  IconChartBar,
  IconCopy,
  IconDots,
  IconEdit,
  IconMessage,
  IconPlayerPause,
  IconPlayerPlay,
  IconPlus,
  IconShare,
  IconTrash,
  IconSelector,
  IconChevronDown,
  IconPencil,
  IconSettings,
  IconCheck,
} from "@tabler/icons-react";

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

const useStyles = createStyles((theme) => ({
  customButton: {
    backgroundColor: "black",
    borderRadius: 18,
    color: "#fff",
    "&:hover": {
      backgroundColor: "grey !important",
    },
  },
}));

export default function SurveyCardList({ getSelectedSurveys, LandingPage }) {
  const { classes, theme } = useStyles();
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
          cols={2}
          spacing={"lg"}
          breakpoints={[
            { minWidth: "xl", cols: 2 },
            { minWidth: "lg", cols: 2 },
            { minWidth: "md", cols: 2 },
            { maxWidth: "md", cols: 1 },
          ]}
        >
          {surveys.map((s) => (
            <SurveyCard
              key={s.id}
              survey={s}
              // survey={surveys}
              // setSelectedTeamId={setSelectedTeamId}
              handleCheckBox={handleCheckBox}
              isChecked={isChecked}
            />
          ))}
        </SimpleGrid>
      </Flex>
    </>
  );
}

interface SurveyCardProps {
  survey: Survey;
  // setSelectedTeamId: React.Dispatch<React.SetStateAction<string>>;
  handleCheckBox: any;
  isChecked: any;
}
function SurveyCard({
  survey,
  // teamsData,
  // setSelectedTeamId,
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
      5000
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
        sx={{ cursor: "pointer" }}
        onClick={(e) => {
          e.stopPropagation(),
            user?.role === "MEMBER"
              ? router.push(
                  `${process.env.NEXT_PUBLIC_FRONTEND_URL}/dashboard/surveys/responses/${survey?.id}`
                )
              : router.push(
                  `${process.env.NEXT_PUBLIC_FRONTEND_URL}/dashboard/surveys/${survey?.id}`
                );
        }}
      >
        <Flex justify={"space-between"} align={"center"}>
          <Text mr={"sm"} truncate size="xl" fw={700}>
            {survey.title}
          </Text>
          <Badge color={survey?.type == "web" ? "blue" : "green"}>
            {survey.type}
          </Badge>
          <Group align={"center"} mt="sm" spacing="xs">
            <Checkbox
              onClick={(e) => {
                handleCheckBox(e, survey?.id);
              }}
              checked={isChecked(survey?.id)}
            ></Checkbox>
          </Group>
        </Flex>
        <Group align={"center"} mt="sm" spacing="xs">
          <Avatar radius={"xl"} />
          <Text size="sm" c="dimmed">
            Created {timeSince}
          </Text>
        </Group>
        <Space h="xl" />
        <Space h="lg" />

        <Flex justify={"space-between"} mt="xl" align={"center"}>
          <StatusBadge active={survey.active} />
          {/* <Text>Total Responses : #</Text> */}
          {/* //TODO */}
          <Link
            href={`/dashboard/surveys/${survey.id}?tab=Responses`}
            style={{ color: theme.colors.blue[9] }}
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <Group spacing="4px">
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
