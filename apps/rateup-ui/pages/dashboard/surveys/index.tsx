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
  Dialog, 
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
  useSurveysByTeam,
} from "../../../backend/surveys/surveys.query";
import { useTeamsByUser } from "../../../backend/team/team.query";
import { useUser } from "../../../context/UserContext";
import CreateSurveyLandingModal from "../LandingPages/CreateSurveyLandingModal";
import { StatusFilterMenu } from "../../../components/Survey/SurveysHome/StatusFilterMenu";
import classes from './Survey.module.css';

export default function Surveys() {
  const [createSurveyOpened, { open, close }] = useDisclosure(false);
  const [
    mergeSurveyOpened,
    { open: openMergeSurvey, close: closeMergeSurveyModal },
  ] = useDisclosure(false);
  const [sort, setSort] = useState(true);
  const { user, setUser } = useUser();
  const [surveyidArray, setSurveyIdArray] = useState([]);
  const [filterParam, setFilterParam] = useState('all')
  const [options, setOptions] = useState([
    {
      value: "all",
      label: "All Teams",
      //group: "Organization",
    },
  ]);
  const [selectedTeamId, setSelectedTeamId] = useState(options[0].value);
  const { action } = useRouter().query;
  const specificTeamIsSelected = selectedTeamId !== "all";

  const {
    isLoading,
    error,
    data: surveys,
  } = useSurveys(specificTeamIsSelected);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (selectedTeamId !== null) {
      queryClient.invalidateQueries(["surveysByTeam", selectedTeamId]);
    }
  }, [selectedTeamId, queryClient]);

  useEffect(() => {
    if (action === 'create') {
      open()
    }
  }, [action]);


  const {
    isLoading: isLoadingTeamsUser,
    data: teamsDataUser,
    error: errorTeamsDataUser,
    refetch: reftchTeams,
  } = useTeamsByUser(queryClient);

  let teamsData = teamsDataUser?.data?.data;

  const {
    isLoading: isLoadingSurveys,
    error: errSurveysByTeams,
    data: surveysByTeam,
  } = useSurveysByTeam(selectedTeamId, specificTeamIsSelected);

  //----------close merge survey modal ---------
  const closeMergeSurvey = () => {
    setSurveyIdArray([]);
    closeMergeSurveyModal();
  };
  

  useEffect(() => {
    if (teamsData?.length) {
      const newOptions = teamsData?.map((team) => ({
        value: team?.teamId,
        label: team?.teamName,
       // group: "Team",
      }));

      setOptions((prev) => {
        const uniqueValues = new Set(prev.map((option) => option.value));
        const nonDuplicateOptions = newOptions.filter(
          (option) => !uniqueValues.has(option.value)
        );
        return [...prev, ...nonDuplicateOptions];
      });
    }
  }, [teamsData]);

  useEffect(() => {
    queryClient.invalidateQueries(["surveysByTeam", selectedTeamId]);
  }, [selectedTeamId]);
  useEffect(() => {
    queryClient.invalidateQueries(["surveysByTeam", selectedTeamId]);
  }, [surveyidArray.length]);

  if (isLoading) return <Loader />;
  if (error || !Array.isArray(surveys)) {
    console.error(surveys, error);
    return "An error has occurred";
  }

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
    <Container fluid>
      <Flex
        mih={50}
        gap="md"
        justify="space-between"
        align="center"
        direction="row"
        wrap="wrap"
      >
        <Flex
          mih={50}
          gap="md"
          justify="flex-start"
          align="center"
          direction="row"
          wrap="wrap"
          mb="md"
        >
          <Title order={1}>Surveys : </Title>

          <Select
            mt="xs"
            data={options}
            defaultValue={options[0].value}
            value={selectedTeamId}
            onChange={(value) => setSelectedTeamId(value)}
          />
          
        </Flex>

        <Flex
          mih={50}
          gap="md"
          justify="flex-start"
          align="flex-start"
          direction="row"
          wrap="wrap"
        >
          {surveyidArray.length > 0 && (
            <Button
              className={classes.customButton}
              onClick={() => openMergeSurvey()}
            >
              merge survey
            </Button>
          )}

          <StatusFilterMenu
            filterParam = {filterParam}
            setFilterParam = {setFilterParam}/>

          <RateupButtonPrimary
            onClick={() => setSort(!sort)}
            title={"Sort"}
            variant="subtle"
            rightIcon={<IconSelector size="1rem" />}
          />
        </Flex>
      </Flex>

      <Space h="xl" />

        <SimpleGrid
          spacing={"lg"}
          cols={{ base: 4, sm: 2, md: 2, lg: 2 , xl: 3}}

          // breakpoints={[
          //   { minWidth: "xl", cols: 3 },
          //   { minWidth: "lg", cols: 2 },
          //   { minWidth: "md", cols: 2 },
          //   { maxWidth: "md", cols: 1 },
          // ]}   //VERIFYCSS //TODO
        >
          {user?.role !== "MEMBER" && (
            <Paper
              p="md"
              shadow="lg"
              radius="lg"
              style={{ cursor: "pointer", color: '#000', background: '#EDEDED' }}
              onClick={open}
            >
              <Center h="100%">
                <Stack align="center">
                  <IconPlus size={36} />
                  <Text size="xl" fw={700}>
                    Add Survey
                  </Text>
                </Stack>
              </Center>
            </Paper>
          )}

          {(specificTeamIsSelected
            ? surveysByTeam?.data?.length > 0
              ? [...surveysByTeam?.data]
              : []
            : [...surveys]
          )
            .slice()
            .sort((a, b) =>
              sort
                ? new Date(b.createdAt).getTime() -
                  new Date(a.createdAt).getTime()
                : new Date(a.createdAt).getTime() -
                  new Date(b.createdAt).getTime()
            ).filter((s) => {
              if(filterParam === 'active'){
                return s.active === true;
              }
              else if(filterParam === 'paused') 
              {
                return s.active === false;
              }else{
                return true;
              }
            })
            .map((s) => (
              <SurveyCard
                key={s.id}
                survey={s}
                teamsData={teamsData}
                setSelectedTeamId={setSelectedTeamId}
                handleCheckBox={handleCheckBox}
                isChecked={isChecked}
              />
            ))}
        </SimpleGrid>
      <CreateSurveyModal
        open={createSurveyOpened}
        close={close}
        surveyType={"web"}
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
    </Container>
  );
}

interface SurveyCardProps {
  survey: Survey;
  setSelectedTeamId: React.Dispatch<React.SetStateAction<string>>;
  handleCheckBox: any;
  isChecked: any;
}
export function SurveyCard({
  survey,
  teamsData,
  setSelectedTeamId,
  handleCheckBox,
  isChecked,
}: SurveyCardProps & { teamsData: any }): JSX.Element {
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
    <Paper
      p="md"
      shadow="lg"
      radius="lg"
      style={{ cursor: "pointer" }}
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
        <Text mr={"sm"} style={{maxWidth:'70%'}} truncate="end" size="xl" fw={700}>
          {survey.title}
        </Text>
        <Group align={"center"} mt="sm" gap="xs">
          <IconPencil />
          <SurveyMenu
            survey={survey}
            teamsData={teamsData}
            setSelectedTeamId={setSelectedTeamId}
          />

          <Checkbox
            onClick={(e) => {
              handleCheckBox(e, survey?.id);
            }}
          ></Checkbox>
        </Group>
      </Flex>
      <Group justify="space-between" >    

        <Group align={"center"} mt="sm" gap="xs">
          <Avatar radius={"xl"} />
          <Text size="sm" c="dimmed">
            Created {timeSince}
          </Text>
        </Group>    
        <StatusBadge active={survey.active} />
      </Group>

      <Space h="xl" />
      <Space h="lg" />

      <Flex justify={"space-between"} mt="xl" align={"center"}>
      <Badge mt="md" color={survey?.type == "web" ? "blue" : "green"}>
          {survey.type}
        </Badge>
        {/* <Text>Total Responses : #</Text> */}
        {/* //TODO */}
        <Link
          href={`/dashboard/surveys/${survey.id}?tab=Responses`}
          style={{ color: theme.colors.blue[9] }}
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
  );
}

function SurveyMenu({ survey, teamsData, setSelectedTeamId }) {
  const queryClient = useQueryClient();
  const router = useRouter();

  const [opened, { close, open }] = useDisclosure(false);
  const [dialogOpened, { toggle, close: closeDialog }] = useDisclosure(false);
  const [isLoading, setIsLoading] = useState(false);

  const [selectedTeamID, setSelectedTeamID] = useState("");
  const cloneSurvey = useCloneSurveyMutation({
    close,
    selectedTeamID,
    setSelectedTeamId,
  });

  const [options, setOptions] = useState([]);

  useEffect(() => {
    const newOptions = teamsData?.map((team) => ({
      value: team?.teamId,
      label: team?.teamName,
    }));

    setOptions(newOptions);
  }, [teamsData]);

  const surveyDeleteMutation = useMutation({
    mutationFn: deleteSurvey,
    onSuccess: () => {
      // notifications.show({
      //   message: "Deleted!",
      // });
      notifications.update({
        id: "load-data",
        color: "teal",
        title: "Success",
        message: "Deleted Survey Successfully!",
        icon: <IconCheck size="1rem" />,
        autoClose: 2000,
      });
      queryClient.invalidateQueries(["surveys"]);
      queryClient.invalidateQueries(["surveysByTeam"]);
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

  const surveyUpdateMutation = useMutation({
    mutationFn: (data: any) => updateSurvey(survey.id, data),
    onSuccess: () => {
      notifications.show({
        id: "survey",
        message: "Survey status Updated!",
        autoClose: true,
      });
      queryClient.invalidateQueries(["surveys"]);
      queryClient.invalidateQueries(["surveysByTeam"]);
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
            <Select
              label="Select Team"
              maxDropdownHeight={150}
              mt="xs"
              placeholder="Pick one"
              data={options}
              value={selectedTeamID}
              onChange={(value) => setSelectedTeamID(value)}
              onClick={(event) => {
                event.stopPropagation();
              }}
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

      <Dialog opened={dialogOpened} withCloseButton onClose={closeDialog} size="lg" radius="md">
          <Text size="md" mb="xs" fw={500}>
              Are you sure to delete this Survey?
          </Text>

          <Group align="center" pt="lg">
          <RateupButtonSecondary onClick={closeDialog} loading={isLoading} size='md' title="Cancel" />

          <RateupButtonPrimary 
          
            onClick={(e) => {
                e.stopPropagation();
                notifications.show({
                  id: "load-data",
                  loading: true,
                  title: "Deleting survey..",
                  message: `Hold on, survey is getting deleted...`,
                  autoClose: false,
                  withCloseButton: false,
                });
                surveyDeleteMutation.mutate(survey?.id);
            }} 
            
            loading={isLoading} size='md' title="Yes, Delete" />

          </Group>
      </Dialog>

      <Menu.Target>
        <ActionIcon variant="subtle"  color="gray"
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
          leftSection={survey.active ? <IconPlayerPause /> : <IconPlayerPlay />}
          onClick={() =>
            surveyUpdateMutation.mutate({ active: !survey.active })
          }
        >
          {survey.active ? "Pause Survey" : "Resume Survey"}
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
        <Menu.Item
          leftSection={<IconTrash />}
          onClick={toggle}
        >
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