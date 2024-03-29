import {
  ActionIcon,
  Avatar,
  Flex,
  Group,
  Loader,
  Menu,
  Paper,
  SimpleGrid,
  Space,
  Text,
  useMantineTheme,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconDots,
  IconPencil,
  IconPlus,
  IconShare,
  IconTrash,
} from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/router";

import { useEffect, useState } from "react";
import { useSurveysLanding } from "../../../backend/surveys/surveys.query";
import { RateupButtonBlue } from "../../../components/Button/RateupButtons";
import { DeleteLandingPageConfirmation } from "../../../components/LandingPage/DeleteLandingConfirmation";
import NothingFound from "../../../components/NothingFound/NothingFound";
import Heading from "../../../components/styled/Heading/Heading";
import { useUser } from "../../../context/UserContext";
import { getTimeSince } from "../../../utils";
import { UserRole } from "../../../utils/enums";
import CreateSurveyLandingModal from "./CreateSurveyLandingModal";
import ShareLandingPageModal from "./ShareLandingPageModal";
export default function LandingPagesList() {
  const [createSurveyOpened, { open, close }] = useDisclosure(false);
  const [landignOpened, { open: openlandingshare, close: closelandingshare }] =
    useDisclosure(false);

  const selectedTeamId = "all";
  const [selectedLandingId, setSelectedLandingId] = useState(null);
  const [shareLandindpageid, setshareLandindpageid] = useState(null);
  const [ShowDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const { action } = useRouter().query;
  const { user } = useUser();

  useEffect(() => {
    if (action === "create") {
      open();
    }
  }, [action]);

  //---------set landing page id for editing--------
  const EditLandingPage = (selectedId) => {
    setSelectedLandingId(selectedId);
  };

  //-----------set sharable landing page id ------
  const shareLandingpageid = (landingid) => {
    setshareLandindpageid(landingid);
  };
  const { isLoading, data: surveyLandingsDataUser } =
    useSurveysLanding(selectedTeamId);
  const queryClient = useQueryClient();

  let surveyLandingData: SurveyLanding[] = [];

  if (Array.isArray(surveyLandingsDataUser)) {
    surveyLandingData = surveyLandingsDataUser;
  }

  useEffect(() => {
    queryClient.invalidateQueries({
      queryKey: ["surveysLanding", selectedTeamId],
    });
  }, [surveyLandingsDataUser, queryClient]);

  const confirmDelete = (isDelete) => {};

  const deleteLanding = (landingPageid) => {
    setDeleteId(landingPageid);
    setShowDeleteConfirmation(true);
  };

  return (
    <>
      <Group gap="md" justify="flex-start">
        <Heading title="Grouped Surveys" titleprops={{ w: "fit-content" }} />
        {user?.role !== UserRole.MEMBER && (
          <RateupButtonBlue
            title="Create Group"
            rightIcon={<IconPlus />}
            onClick={open}
          />
        )}
      </Group>
      {isLoading ? (
        <Group m="100px">
          <Loader color="blue" type="bars" />
        </Group>
      ) : (
        <SimpleGrid
          cols={{ base: 2, sm: 1, md: 2, lg: 3, xl: 3 }}
          mt={20}
          spacing={"lg"}
        >
          {surveyLandingData
            ?.slice()
            ?.reverse()
            ?.map((s) => (
              <SurveyCard
                key={s.id}
                survey={s}
                open={open}
                EditLandingPage={EditLandingPage}
                openlandingshare={openlandingshare}
                shareLandingpageid={shareLandingpageid}
                deleteLanding={deleteLanding}
              />
            ))}
        </SimpleGrid>
      )}
      {!isLoading && surveyLandingData?.length == 0 && (
        <NothingFound text="No grouped surveys" />
      )}
      <CreateSurveyLandingModal
        open={createSurveyOpened}
        close={close}
        surveyType={"web"}
        landingPageId={selectedLandingId}
        surveyIdArray={[]}
        mergeSurvey={false}
      />

      {/* //--------------share landing page----------- */}
      <ShareLandingPageModal
        open={landignOpened}
        close={closelandingshare}
        surveyType={"web"}
        landingPageId={shareLandindpageid ? shareLandindpageid : null}
      />

      <DeleteLandingPageConfirmation
        showModal={ShowDeleteConfirmation}
        confirmDelete={confirmDelete}
      />

      {/* //--------------share landing page----------- */}
      <ShareLandingPageModal
        open={landignOpened}
        close={closelandingshare}
        surveyType={"web"}
        landingPageId={shareLandindpageid ? shareLandindpageid : null}
      />

      <DeleteLandingPageConfirmation
        showModal={ShowDeleteConfirmation}
        confirmDelete={confirmDelete}
      />
    </>
  );
}

//---------------survey landing page cards-----------------
interface SurveyLandingCardProps {
  survey: SurveyLanding;
  open: any;
}

export function SurveyCard({
  survey,
  open,
  EditLandingPage,
  openlandingshare,
  shareLandingpageid,
  deleteLanding,
}): JSX.Element {
  const theme = useMantineTheme();
  const [timeSince, setTimeSince] = useState("");

  const router = useRouter();
  useEffect(() => {
    setTimeSince(getTimeSince(survey.createdAt));
    const timeoutID = setInterval(
      () => setTimeSince(getTimeSince(survey.createdAt)),
      5000,
    );
    return () => clearInterval(timeoutID);
  }, []);

  // //--------share landing page id call back -----------
  // const shareLandingPageidCallback =(landingid)=>{
  //   shareLandingpageid(landingid)
  // }

  return (
    <Paper
      p="md"
      shadow="lg"
      radius="lg"
      style={{ cursor: "pointer" }}
      onClick={() => {
        router.push(
          `${process.env.NEXT_PUBLIC_FRONTEND_URL}/dashboard/groupsurveys/${survey?.id}`,
        );
      }}
    >
      <Flex justify={"space-between"} align={"center"}>
        <Text mr={"sm"} truncate size="xl" fw={700} tt={"capitalize"}>
          {survey.title}
        </Text>

        <Group align={"center"} mt="sm" gap="xs">
          <IconPencil
            onClick={(e) => {
              e.stopPropagation(), EditLandingPage(survey.id);
              open();
            }}
          />
          <SurveyMenu
            survey={survey}
            openlandingshare={openlandingshare}
            shareLandingpageid={shareLandingpageid}
            deleteLanding={deleteLanding}
          />
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
        <Text>Total Surveys : {survey?.surveys?.length}</Text>
      </Flex>
    </Paper>
  );
}

//-----------menu area ---------------
function SurveyMenu({
  survey,
  openlandingshare,
  shareLandingpageid,
  deleteLanding,
}) {
  const queryClient = useQueryClient();
  const router = useRouter();

  const [selectedTeamID, setSelectedTeamID] = useState("");

  const [options, setOptions] = useState([]);

  // const LandingPageDeleteMutation = useMutation({
  //   mutationFn: deleteLandingPage,
  //   onSuccess: () => {
  //     notifications.update({
  //       id: "load-data",
  //       color: "teal",
  //       title: "Success",
  //       loading: false,
  //       message: "Deleted Landing Page Successfully!",
  //       icon: <IconCheck size="1rem" />,
  //       autoClose: 2000,
  //     });
  //     queryClient.invalidateQueries({ queryKey: ["surveysLanding"] });
  //   },
  //   onError: (error: any) => {
  //     notifications.update({
  //       id: "load-data",
  //       color: "red",
  //       loading: false,
  //       title: "Delete Failed..!",
  //       message: error?.response?.data?.error,
  //       icon: <IconCheck size="1rem" />,
  //       autoClose: 4000,
  //     });
  //   },
  // });

  return (
    <Menu width={200}>
      <Menu.Target>
        <ActionIcon
          variant="subtle"
          color="gray"
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
          leftSection={<IconShare />}
          onClick={(e) => {
            shareLandingpageid(survey?.id), openlandingshare();
          }}
        >
          Share
        </Menu.Item>

        <Menu.Item
          leftSection={<IconTrash />}
          onClick={() => {
            deleteLanding(survey?.id);
          }}
        >
          Delete
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
