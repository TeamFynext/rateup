import {
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
  Modal,
  Checkbox,
  Dialog,
  rem,
} from "@mantine/core";
import {
  IconChartBar,
  IconCopy,
  IconDots,
  IconPlayerPause,
  IconPlayerPlay,
  IconPlus,
  IconShare,
  IconTrash,
  IconSelector,
  IconPencil,
  IconSettings,
  IconCheck,
} from "@tabler/icons-react";
import {
  RateupButtonBlue,
  RateupButtonPrimary,
  RateupButtonSecondary,
} from "../../../components/Button/RateupButtons";
import Link from "next/link";
import { getTimeSince } from "../../../utils";
import { useDisclosure } from "@mantine/hooks";
import { CreateSurveyModal } from "../../../components/Survey/CreateSurveyModal";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { notifications } from "@mantine/notifications";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  deleteSurvey,
  updateSurvey,
} from "../../../backend/surveys/survey.api";
import {
  useCloneSurveyMutation,
  useSurveys,
} from "../../../backend/surveys/surveys.query";
import { useUser } from "../../../context/UserContext";
import { StatusFilterMenu } from "../../../components/Survey/SurveysHome/StatusFilterMenu";
import { UserRole } from "../../../utils/enums";
import { TeamSelector } from "../../../components/input/TeamSelector";
import PaperLayout from "../../../components/styled/Layouts/PaperLayout";
import CreateSurveyLandingModal from "../groupsurveys/CreateSurveyLandingModal";

export default function Surveys() {
  const [createSurveyOpened, { open, close }] = useDisclosure(false);
  const [
    mergeSurveyOpened,
    { open: openMergeSurvey, close: closeMergeSurveyModal },
  ] = useDisclosure(false);
  const [sort, setSort] = useState(true);
  const { user } = useUser();
  const [surveyidArray, setSurveyIdArray] = useState([]);
  const [filterParam, setFilterParam] = useState("all");
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const { action } = useRouter().query;
  const {
    isLoading,
    error,
    data: allSurveys,
    refetch,
  } = useSurveys(selectedTeamId ? true : false);
  const router = useRouter();
  useEffect(() => {
    if (action === "create") {
      open();
    }
  }, [action]);

  //----------close merge survey modal ---------
  const closeMergeSurvey = () => {
    setSurveyIdArray([]);
    closeMergeSurveyModal();
  };

  if (isLoading) return <Loader />;
  if (error || !Array.isArray(allSurveys)) {
    console.error(allSurveys, error);
    return (
      <Stack>
        <Text>An error occured!</Text>
        <RateupButtonSecondary title="Try again" onClick={refetch} />
      </Stack>
    );
  }
  const surveys =
    selectedTeamId === "all" || !selectedTeamId
      ? allSurveys.filter((s: Survey) => s.type !== "whatsapp")
      : allSurveys.filter(
          (s: Survey) => s.teamId === selectedTeamId && s.type !== "whatsapp",
        );
  //--------handle check box click ----------

  const handleCheckBox = (e, surveyid, checked) => {
    e.stopPropagation();
    if (surveyidArray.includes(surveyid)) {
      setSurveyIdArray(surveyidArray.filter((id) => id !== surveyid));
    } else if (e.target.checked) {
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
      <Group gap="md" justify="space-between">
        <Group gap="md" justify="flex-start">
          <Title order={1}>Surveys : </Title>
          <TeamSelector
            value={selectedTeamId}
            onChange={(teamId) => setSelectedTeamId(teamId)}
            enableAll={true}
          />
          {user?.role !== UserRole.MEMBER && (
            <RateupButtonBlue
              title="Add Survey"
              rightIcon={<IconPlus />}
              radius="xl"
              size="md"
              onClick={open}
            />
          )}
        </Group>

        <Group gap="md" justify="flex-start">
          {surveyidArray.length > 0 && (
            <RateupButtonPrimary
              title="Group survey"
              onClick={() => openMergeSurvey()}
            />
          )}

          <StatusFilterMenu
            filterParam={filterParam}
            setFilterParam={setFilterParam}
          />

          <RateupButtonPrimary
            onClick={() => setSort(!sort)}
            title={"Sort"}
            variant="subtle"
            rightIcon={<IconSelector size="1rem" />}
          />
        </Group>
      </Group>

      <Space h="lg" />

      <SimpleGrid
        style={{ overflow: "auto" }}
        spacing={"lg"}
        cols={{ base: 4, sm: 2, md: 2, lg: 2, xl: 3 }}
        p={1}
      >
        {surveys
          .sort((a, b) =>
            sort
              ? new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime()
              : new Date(a.createdAt).getTime() -
                new Date(b.createdAt).getTime(),
          )
          .filter((s) => {
            if (filterParam === "active") {
              return s.active === true;
            } else if (filterParam === "paused") {
              return s.active === false;
            } else {
              return true;
            }
          })
          .map((s) => (
            <SurveyCard
              key={s.id}
              survey={s}
              handleCheckBox={handleCheckBox}
              isChecked={isChecked}
            />
          ))}
      </SimpleGrid>
      <CreateSurveyModal
        open={createSurveyOpened}
        close={close}
        surveyType={"web"}
        onCreate={(s) => {
          router.push(`/dashboard/surveys/${s.id}`);
        }}
      />
      {/* //---------create landing page modal ------------ */}
      <CreateSurveyLandingModal
        open={mergeSurveyOpened}
        close={closeMergeSurvey}
        surveyType={"web"}
        landingPageId={null}
        surveyIdArray={surveyidArray}
        mergeSurvey={true}
      ></CreateSurveyLandingModal>
    </>
  );
}

interface SurveyCardProps {
  survey: Survey;
  handleCheckBox: any;
  isChecked: any;
}
export function SurveyCard({
  survey,
  handleCheckBox,
  isChecked,
}: SurveyCardProps): JSX.Element {
  const theme = useMantineTheme();
  const [timeSince, setTimeSince] = useState("");
  const { user, setUser } = useUser();

  useEffect(() => {
    setTimeSince(getTimeSince(survey?.createdAt));
    const timeoutID = setInterval(
      () => setTimeSince(getTimeSince(survey?.createdAt)),
      5000,
    );
    return () => clearInterval(timeoutID);
  }, []);

  const router = useRouter();

  return (
    <PaperLayout
      p="md"
      shadow="lg"
      radius="lg"
      style={{ cursor: "pointer" }}
      onClick={(e) => {
        e.stopPropagation(),
          user?.role === UserRole.MEMBER
            ? router.push(
                `${process.env.NEXT_PUBLIC_FRONTEND_URL}/dashboard/surveys/responses/${survey?.id}`,
              )
            : router.push(
                `${process.env.NEXT_PUBLIC_FRONTEND_URL}/dashboard/surveys/${survey?.id}`,
              );
      }}
    >
      <Flex justify={"space-between"} align={"center"}>
        <Text
          mr={"sm"}
          style={{ maxWidth: "70%" }}
          truncate="end"
          size="xl"
          fw={700}
        >
          {survey?.title}
        </Text>
        <Group align={"center"} mt="sm" gap="xs">
          <IconPencil />
          <SurveyMenu survey={survey} />

          <Checkbox
            onClick={(e) => {
              handleCheckBox(e, survey?.id);
            }}
          ></Checkbox>
        </Group>
      </Flex>
      <Group justify="space-between">
        <Group align={"center"} mt="sm" gap="xs">
          <Avatar radius={"xl"} />
          <Text size="sm" c="dimmed">
            Created {timeSince}
          </Text>
        </Group>
        <StatusBadge active={survey?.active} />
      </Group>

      <Space h="xl" />
      <Space h="lg" />

      <Flex justify={"space-between"} mt="xl" align={"center"}>
        <Badge
          mt="md"
          color={survey?.type == "web" ? "var(--tertiary-color)" : "green"}
        >
          {survey?.type}
        </Badge>
        {/* <Text>Total Responses : #</Text> */}
        {/* //TODO */}
        <Link
          href={`/dashboard/surveys/${survey?.id}?tab=Responses`}
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
    </PaperLayout>
  );
}

function SurveyMenu({ survey }) {
  const queryClient = useQueryClient();
  const router = useRouter();

  const [opened, { close, open }] = useDisclosure(false);
  const [dialogOpened, { toggle, close: closeDialog }] = useDisclosure(false);
  const [isLoading, setIsLoading] = useState(false);

  const [selectedTeamID, setSelectedTeamID] = useState("");
  const cloneSurvey = useCloneSurveyMutation({
    close,
    selectedTeamID,
  });

  const surveyDeleteMutation = useMutation({
    mutationFn: deleteSurvey,
    onSuccess: () => {
      // notifications.show({
      //   message: "Deleted!",
      // });
      notifications.update({
        id: "delete-data",
        color: "teal",
        title: "Success",
        message: "Deleted Survey Successfully!",
        loading: false,
        icon: <IconCheck style={{ width: rem(18), height: rem(18) }} />,
        autoClose: 2000,
      });
      queryClient.invalidateQueries(["surveys"]);
    },
    onError: (error: any) => {
      console.error("Error deleting Survey:", error.message);
      notifications.update({
        id: "load-data",
        loading: false,
        color: "red",
        title: "Delete Failed..!",
        message: error?.response?.data?.error,
        icon: <IconCheck size="1rem" />,
        autoClose: 4000,
      });
    },
  });

  const surveyUpdateMutation = useMutation({
    mutationFn: (data: any) => updateSurvey(survey.id, data),
    onSuccess: () => {
      notifications.show({
        id: "survey",
        message: "Survey status Updated!",
        autoClose: true,
      });
      queryClient.invalidateQueries(["surveys"]);
    },
  });

  return (
    <Menu width={200}>
      <Modal
        size="sm"
        centered
        opened={opened}
        onClose={close}
        title={<h2>Clone Survey</h2>}
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <Stack>
          <Text pr="xl" color="dark.2">
            Select the team in which the copy to be created.
          </Text>
          <Group mt="md" style={{ minHeight: "200px" }}>
            <TeamSelector
              label="Select Team"
              value={selectedTeamID}
              onChange={setSelectedTeamID}
            />
          </Group>
          <Group mt="xl">
            <RateupButtonSecondary title="Cancel" onClick={close} />
            <RateupButtonPrimary
              title="Submit"
              onClick={() => {
                cloneSurvey.mutate({ id: survey?.id, teamId: selectedTeamID });
              }}
            />
          </Group>
        </Stack>
      </Modal>

      <Dialog
        opened={dialogOpened}
        withCloseButton
        onClose={closeDialog}
        size="lg"
        radius="md"
        position={{ top: "0", left: "40vw" }}
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <Text size="md" mb="xs" fw={500}>
          Are you sure to delete this Survey?
        </Text>

        <Group align="center" pt="lg">
          <RateupButtonSecondary
            onClick={(e) => {
              e.stopPropagation();
              closeDialog();
            }}
            loading={isLoading}
            size="md"
            title="Cancel"
          />

          <RateupButtonPrimary
            onClick={(e) => {
              e.stopPropagation();
              notifications.show({
                id: "delete-data",
                loading: true,
                title: "Deleting survey..",
                message: `Hold on, survey is getting deleted...`,
                autoClose: false,
                withCloseButton: false,
              });
              surveyDeleteMutation.mutate(survey?.id);
            }}
            loading={isLoading}
            size="md"
            title="Yes, Delete"
          />
        </Group>
      </Dialog>

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
          leftSection={
            survey?.active ? <IconPlayerPause /> : <IconPlayerPlay />
          }
          onClick={() =>
            surveyUpdateMutation.mutate({ active: !survey?.active })
          }
        >
          {survey?.active ? "Pause Survey" : "Resume Survey"}
        </Menu.Item>

        <Menu.Item
          leftSection={<IconShare />}
          onClick={() => {
            router.push(`/dashboard/surveys/${survey?.id}?tab=Share`);
          }}
        >
          Share
        </Menu.Item>
        <Menu.Item
          leftSection={<IconCopy />}
          onClick={() => {
            open();
          }}
        >
          Clone
        </Menu.Item>
        <Menu.Item leftSection={<IconTrash />} onClick={toggle}>
          Delete
        </Menu.Item>

        <Menu.Item
          leftSection={<IconSettings />}
          onClick={() => {
            router.push(`/dashboard/surveys/${survey?.id}?tab=Settings`);
          }}
        >
          Settings
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}

function StatusBadge({ active }) {
  return (
    <Badge mt="md" color={active ? "green" : "yellow"}>
      {active ? "Active" : "Paused"}
    </Badge>
  );
}
