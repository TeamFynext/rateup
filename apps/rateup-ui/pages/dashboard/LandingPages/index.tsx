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
import { notifications } from "@mantine/notifications";
import { useMutation } from "@tanstack/react-query";

import { useDisclosure } from "@mantine/hooks";
import { QueryClient, dehydrate, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/router";

import { useSurveysLanding } from "../../../backend/surveys/surveys.query";
import { useEffect, useState } from "react";
import { getTimeSince } from "../../../utils";
import CreateSurveyLandingModal from "./CreateSurveyLandingModal";
import { deleteLandingPage } from "../../../backend/LandingPage/landingpage.api";
export default function LandingPages() {
  const [createSurveyOpened, { open, close }] = useDisclosure(false);
  const selectedTeamId = "all";
  const [selectedLandingId, setSelectedLandingId] = useState(null);

  //---------set landing page id for editing--------
  const EditLandingPage = (selectedId) => {
    setSelectedLandingId(selectedId);
  };
  console.log(selectedLandingId, ">>>sooaliio");
  const {
    isLoading,
    error,
    data: surveyLandingsDataUser,
  } = useSurveysLanding(selectedTeamId);
  const queryClient = useQueryClient();

  let surveyLandingData: SurveyLanding[] = [];

  if (Array.isArray(surveyLandingsDataUser)) {
    surveyLandingData = surveyLandingsDataUser;
  }

  useEffect(() => {
    console.log("survey DATA8888888::", surveyLandingsDataUser);
    queryClient.invalidateQueries(["surveysLanding", selectedTeamId]);
  }, [surveyLandingsDataUser, queryClient]);

  // let surveyLandingsData = survetlandingsData?.data;
  // console.log(surveyData.length, ">>>reforoooilo");
  return (
    <>
      <Container fluid>
        <Flex justify={"space-between"} align={"center"}>
          <Text mr={"sm"} truncate size="xl" fw={700}>
            Create your survey Landing Page
          </Text>
        </Flex>

        <SimpleGrid
          cols={4}
          mt={10}
          spacing={"lg"}
          breakpoints={[
            { minWidth: "xl", cols: 3 },
            { minWidth: "lg", cols: 2 },
            { minWidth: "md", cols: 2 },
            { maxWidth: "md", cols: 1 },
          ]}
        >
          <Paper
            p="md"
            shadow="lg"
            radius="lg"
            sx={{ cursor: "pointer" }}
            onClick={open}
          >
            <Center h="100%">
              <Stack align="center">
                <IconPlus size={36} />
                <Text size="xl" fw={700}>
                  Add Landing Page
                </Text>
              </Stack>
            </Center>
          </Paper>

          {surveyLandingData.map((s) => (
            <SurveyCard
              key={s.id}
              survey={s}
              open={open}
              EditLandingPage={EditLandingPage}
            />
          ))}
        </SimpleGrid>
        {surveyLandingData.length == 0 && (
          <Text ta={"center"} fw={600}>
            No Landing pages found
          </Text>
        )}
        <CreateSurveyLandingModal
          open={createSurveyOpened}
          close={close}
          surveyType={"web"}
          landingPageId={selectedLandingId}
        />
      </Container>
    </>
  );
}

//---------------survey landing page cards-----------------
interface SurveyLandingCardProps {
  survey: SurveyLanding;
  open: any;
  // setSelectedTeamId: React.Dispatch<React.SetStateAction<string>>;
}

export function SurveyCard({ survey, open, EditLandingPage }): JSX.Element {
  const theme = useMantineTheme();
  const [timeSince, setTimeSince] = useState("");

  console.log(survey, "istanbooool");
  const router = useRouter();
  console.log(survey, ">>>>ooofolio");
  useEffect(() => {
    setTimeSince(getTimeSince(survey.createdAt));
    const timeoutID = setInterval(
      () => setTimeSince(getTimeSince(survey.createdAt)),
      5000
    );
    return () => clearInterval(timeoutID);
  }, []);

  return (
    <Paper
      p="md"
      shadow="lg"
      radius="lg"
      sx={{ cursor: "pointer" }}
      onClick={() => {
        router.push(
          `${process.env.NEXT_PUBLIC_FRONTEND_URL}/dashboard/surveylandinglist/${survey?.id}`
        );
      }}
    >
      <Flex justify={"space-between"} align={"center"}>
        <Text mr={"sm"} truncate size="xl" fw={700} tt={"capitalize"}>
          {survey.title}
        </Text>

        <Group align={"center"} mt="sm" spacing="xs">
          <IconPencil
            onClick={(e) => {
              e.stopPropagation(),
                console.log("enter cikkkk"),
                EditLandingPage(survey.id);
              open();
            }}
          />
          <SurveyMenu survey={survey} />
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
        {/* <StatusBadge active={survey.active} /> */}
        <Text>Total Surveys : {survey?.surveys?.length}</Text>
        {/* <Link
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
        </Link> */}
      </Flex>
    </Paper>
  );
}

//-----------menu area ---------------
function SurveyMenu({ survey}) {
  const queryClient = useQueryClient();
  const router = useRouter();

  const [opened, { close, open }] = useDisclosure(false);
  const [selectedTeamID, setSelectedTeamID] = useState("");
 

  const [options, setOptions] = useState([]);

  // useEffect(() => {
  //   const newOptions = teamsData?.map((team) => ({
  //     value: team?.teamId,
  //     label: team?.teamName,
  //   }));

  //   setOptions(newOptions);
  // }, [teamsData]);

  const LandingPageDeleteMutation = useMutation({
    mutationFn: deleteLandingPage,
    onSuccess: () => {
      
      notifications.update({
        id: "load-data",
        color: "teal",
        title: "Success",
        message: "Deleted Landing Page Successfully!",
        icon: <IconCheck size="1rem" />,
        autoClose: 2000,
      });
      queryClient.invalidateQueries(["surveysLanding"]);
      // queryClient.invalidateQueries(["surveysByTeam"]);
    },
    onError: (error: any) => {
      console.error("Error deleting Survey:", error.message);
      notifications.update({
        id: "load-data",
        color: "red",
        title: "Delete Failed..!",
        message: error?.response?.data?.error,
        icon: <IconCheck size="1rem" />,
        autoClose: 4000,
      });
    },
  });

 

  return (
    <Menu width={200}>
      <Menu.Target>
        <ActionIcon
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <IconDots />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <Menu.Item
          icon={<IconShare />}
          // onClick={() => {
          //   router.push(`/dashboard/surveys/${survey?.id}?tab=Share`);
          // }}
        >
          Share
        </Menu.Item>

        <Menu.Item
          icon={<IconTrash />}
          onClick={() => {
            notifications.show({
              id: "load-data",
              loading: true,
              title: "Deleting Landing page..",
              message: `Hold on, landing page is getting deleted...`,
              autoClose: false,
              withCloseButton: false,
            });
            LandingPageDeleteMutation.mutate(survey?.id);
          }}
        >
          Delete
        </Menu.Item>

        
      </Menu.Dropdown>
    </Menu>
  );
}
