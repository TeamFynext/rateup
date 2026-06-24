"use client";

import React, { useState } from "react";

import { Box, Group, Loader, Stack, Text, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconPlus } from "@tabler/icons-react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useSurveyTemplates } from "@/backend/surveys/surveys.query";
import { useTeamsByUser } from "@/backend/team/team.query";
import InfoButton from "@/components/Button/InfoButton.tsx";
import {
  RateupButtonBlue,
  RateupButtonPrimary,
} from "@/components/Button/RateupButtons.tsx";
import RefreshButton from "@/components/Button/RefreshButton.tsx";
import SurveyTemplates from "@/components/dashboard/surveys/templates/surveyTemplates.tsx";
import RateupLoader from "@/components/Loaders/RateupLoader.tsx";
import FormModalLayout from "@/components/Modal/FormModalLayout.tsx";
import NothingFound from "@/components/NothingFound/NothingFound.tsx";
import Heading from "@/components/styled/Heading/Heading.tsx";
import { CreateSurveyModal } from "@/components/Survey/CreateSurveyModal.tsx";
import { useUser } from "@/context/UserContext.tsx";
import { docsPath } from "@/utils/constants.ts";
import { UserRole } from "@/utils/enums/index.ts";

export const Route = createFileRoute("/dashboard/surveys/templates/")({
  component: Templates,
});

function Templates({ survey }) {
  const { user } = useUser();
  const { data: teamRes, isLoading: teamsLoading, isError } = useTeamsByUser();
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const navigate = useNavigate();
  const [opened, { open, close }] = useDisclosure(false);
  const { t: translations } = useTranslation();
  const [
    createSurveyOpened,
    { open: openCreateSurvey, close: closeCreateSurvey },
  ] = useDisclosure(false);

  const { isLoading, data: allTemplates, refetch } = useSurveyTemplates("web");

  const bgTemp = {
    backgroundColor: "#fff",
  };

  function Category({ categoryName, surveys }) {
    return (
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
  }

  if (isLoading || teamsLoading) return <RateupLoader />;

  return (
    <Stack gap={0}>
      {/* <Modal opened={opened} onClose={close} title="Create Survey from Template" size="auto" centered> */}
      <Group
        style={{ textAlign: "center", alignItems: "center", margin: "auto" }}
      >
        <FormModalLayout
          opened={opened}
          title={translations("Create Survey from Template")}
          onClose={close}
          centered
          size={"lg"}
        >
          <Stack style={{ Width: "100%", textAlign: "center" }}>
            <Title
              order={3}
              style={{ alignItems: "center", color: "var(--shade-of-blue-3)" }}
            >
              {selectedTemplate?.title || translations("Template")}
            </Title>
            <Text
              style={{
                alignItems: "center",
                textAlign: "center",
                marginBottom: "1rem",
              }}
            >
              {translations(
                "Customize and deploy this survey effortlessly to uncover actionable data that drives informed decisions and enhances your business strategies",
              )}
            </Text>
            <RateupButtonPrimary
              title={translations("Try this Template")}
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
          <Heading
            title={translations("Survey Templates")}
            titleprops={{ w: "500px" }}
          />
          <InfoButton docUrl={`${docsPath}/webSurvey/surveyTemplates`} />
          <RefreshButton queryKeys={["survey-templates"]} />
        </Group>
        {user?.role !== UserRole.MEMBER && (
          <RateupButtonBlue
            miw={"10.9375rem"}
            mr={"200px"}
            rightIcon={<IconPlus />}
            title={translations("Start Blank")}
            onClick={() => {
              navigate({
                to: `/dashboard/surveys?action=create`,
              });
              toast.loading(
                translations("Hold.. your survey is getting setup.."),
                {
                  id: "blank-survey",
                },
              );
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
            <NothingFound text={translations("No templates found..!!")} />
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
}
