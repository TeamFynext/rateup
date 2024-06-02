import {
  ActionIcon,
  Box,
  Group,
  Loader,
  Tooltip as MantineTooltip,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { IconPlus, IconRefresh } from "@tabler/icons-react";
import { useRouter } from "next/router";
import React, { useState } from "react";
import { useSurveyTemplates } from "../../../../backend/surveys/surveys.query";
import { useTeamsByUser } from "../../../../backend/team/team.query";
import {
  RateupButtonBlue,
  RateupButtonPrimary,
} from "../../../../components/Button/RateupButtons";
import RateupLoader from "../../../../components/Loaders/RateupLoader";
import FormModalLayout from "../../../../components/Modal/FormModalLayout";
import { CreateSurveyModal } from "../../../../components/Survey/CreateSurveyModal";
import Heading from "../../../../components/styled/Heading/Heading";
import { useUser } from "../../../../context/UserContext";
import { UserRole } from "../../../../utils/enums";
import SurveyTemplates from "./surveyTemplates";
import NothingFound from "../../../../components/NothingFound/NothingFound";

const Templates = ({ survey }) => {
  const { user } = useUser();
  const { data: teamRes, isLoading: teamsLoading, isError } = useTeamsByUser();
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const router = useRouter();
  const [opened, { open, close }] = useDisclosure(false);

  const [
    createSurveyOpened,
    { open: openCreateSurvey, close: closeCreateSurvey },
  ] = useDisclosure(false);

  const { isLoading, data: allTemplates, refetch } = useSurveyTemplates("web");

  const bgTemp = {
    backgroundColor: "#fff",
  };

  const Category = ({ categoryName, surveys }) => (
    <Stack mt="md">
      <h2>{categoryName}</h2>
      <Group mt="-30px" align="flex-start">
        {surveys?.map((survey, index) => (
          <Box key={survey?.id}>
            <SurveyTemplates
              key={index}
              survey={survey}
              setSelectedTemplate={setSelectedTemplate}
              bgTemp={bgTemp}
              open={open}
            />
            <Text
              style={{
                marginLeft: "3rem",
                marginTop: "12px",
                marginBottom: "15px",
              }}
            >
              {" "}
              {survey.title}
            </Text>
          </Box>
        ))}
      </Group>
    </Stack>
  );

  if (isLoading || teamsLoading) return <RateupLoader />;

  return (
    <Stack gap={0}>
      {/* <Modal opened={opened} onClose={close} title="Create Survey from Template" size="auto" centered> */}

      <Group
        style={{ textAlign: "center", alignItems: "center", margin: "auto" }}
      >
        <FormModalLayout
          opened={opened}
          title="Create Survey from Template"
          onClose={close}
          centered
          size={"lg"}
        >
          <Stack style={{ Width: "100%", textAlign: "center" }}>
            <Title
              order={3}
              style={{ alignItems: "center", color: "var(--shade-of-blue-3)" }}
            >
              {selectedTemplate?.title || "Template"}
            </Title>
            <Text
              style={{
                alignItems: "center",
                textAlign: "center",
                marginBottom: "1rem",
              }}
            >
              Customize and deploy this survey effortlessly to uncover
              actionable data that drives informed decisions and enhances your
              business strategies
            </Text>
            <RateupButtonPrimary
              title="Try this Template"
              onClick={() => {
                setSelectedTemplate(selectedTemplate);
                close();
                openCreateSurvey();
              }}
            />
          </Stack>
        </FormModalLayout>
      </Group>
      {/* </Modal> */}

      <CreateSurveyModal
        open={createSurveyOpened}
        close={closeCreateSurvey}
        surveyType={"web"}
        teamsData={teamRes?.data}
        template={selectedTemplate}
        setTemplate={setSelectedTemplate}
      />

      <Group gap="md" justify="space-between">
        <Group ml="md">
          <Heading title={"Survey Templates"} titleprops={{ w: "500px" }} />
          <MantineTooltip label="Refresh data">
            <ActionIcon
              variant="light"
              onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                refetch();
                notifications.show({
                  id: "data-reload",
                  color: "teal",
                  title: "Refreshing data",
                  loading: true,
                  message: "Hold.. your data is getting update...",
                  autoClose: 2000,
                });
              }}
            >
              <IconRefresh
                style={{ width: "90%", height: "90%" }}
                stroke={1.5}
              />
            </ActionIcon>
          </MantineTooltip>
        </Group>
        {user?.role !== UserRole.MEMBER && (
          <RateupButtonBlue
            mr={"200px"}
            rightIcon={<IconPlus />}
            title="Start Blank"
            onClick={() => {
              router.push(`/dashboard/surveys?action=create`);
              notifications.show({
                id: "blank-survey",
                color: "teal",
                title: "Setting up Blank Template..",
                loading: true,
                message: "Hold.. your survey is getting setup..",
                autoClose: 2000,
              });
            }}
          />
        )}
      </Group>

      {isLoading && (
        <Box m="200px">
          {" "}
          <Loader type="bars" />{" "}
        </Box>
      )}

      {allTemplates && (
        <Box m="lg" pb="xl">
          {Object?.entries(allTemplates)?.length < 1 && (
            <NothingFound text="No templates found..!!" />
          )}

          {Object?.entries(allTemplates)?.map(
            ([categoryName, surveys], index) => (
              <Category
                key={index}
                categoryName={categoryName}
                surveys={surveys}
              />
            ),
          )}
        </Box>
      )}
    </Stack>
  );
};

export default Templates;
