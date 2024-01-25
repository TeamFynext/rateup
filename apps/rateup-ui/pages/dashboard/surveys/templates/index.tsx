import {
  ActionIcon,
  BackgroundImage,
  Box,
  Center,
  Flex,
  Group,
  Loader,
  Paper,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import React, { useState } from "react";
import { IconPlus, IconRefresh } from "@tabler/icons-react";
import { useUser } from "../../../../context/UserContext";
import Heading from "../../../../components/styled/Heading/Heading";
import { UserRole } from "../../../../utils/enums";
import {
  RateupButtonBlue,
  RateupButtonPrimary,
} from "../../../../components/Button/RateupButtons";
import { useSurveyTemplates } from "../../../../backend/surveys/surveys.query";
import { useDisclosure } from "@mantine/hooks";
import { useRouter } from "next/router";
import { lexend300 } from "../../../../utils/fonts";
import { notifications } from "@mantine/notifications";
import { Tooltip as MantineTooltip } from "@mantine/core";
import FormModalLayout from "../../../../components/Modal/FormModalLayout";
import { THUMBNAIL_URL } from "../../../../utils/constants";
import { ImageWithThumb } from "../../../../components/Survey/Template/ImageWithThumb";

const Templates = () => {
  const { user } = useUser();
  const [opened, { open, close }] = useDisclosure(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const router = useRouter();

  const {
    isLoading,
    error,
    data: allTemplates,
    refetch,
  } = useSurveyTemplates("web");

  const bgTemp = {
    backgroundColor: "#fff",
  };

  const Category = ({ categoryName, surveys }) => (
    <Stack mt="md">
      <h2>{categoryName}</h2>
      <Group mt="-30px" align="flex-start">
        {surveys?.map((survey, index) => (
          <Survey key={index} survey={survey} />
        ))}
      </Group>
    </Stack>
  );

  const Survey = ({ survey }) => (
    <Stack>
      <Paper
        radius={"lg"}
        shadow="md"
        mr="md"
        onClick={() => {
          setSelectedTemplate(survey);
          open();
        }}
        style={{
          ...(survey?.WelcomeTheme?.bgType === "bgcolor"
            ? survey?.WelcomeTheme?.bgStyles
            : bgTemp),
          width: "230px",
          minHeight: "150px",
          cursor: "pointer",
        }}
      >
        {survey?.WelcomeTheme?.bgUrl && (
          <ImageWithThumb
            radius="md"
            fit="fill"
            h={150}
            src={`${survey?.WelcomeTheme?.bgUrl}`}
          />
        )}
      </Paper>
      <Center>
        <Text style={{ maxWidth: "200px" }}>{survey.title}</Text>
      </Center>
    </Stack>
  );

  return (
    <>
      {/* <Modal opened={opened} onClose={close} title="Create Survey from Template" size="auto" centered> */}
      <FormModalLayout
        opened={opened}
        title="Create Survey from Template"
        onClose={close}
        centered
        size="auto"
      >
        <Group p="xl">
          <Flex
            h={"70vh"}
            w={"50vw"}
            style={
              selectedTemplate?.WelcomeTheme?.bgType === "bgcolor"
                ? selectedTemplate?.WelcomeTheme?.bgStyles
                : bgTemp
            }
            ff={lexend300.style.fontFamily}
          >
            <BackgroundImage
              style={{
                height: "85%",
                width: "90%",
                objectFit: "contain",
                borderRadius: "10px",
              }}
              src={`${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${selectedTemplate?.WelcomeTheme?.bgUrl}`}
            />
          </Flex>

          <Stack style={{ minWidth: "300px", maxWidth: "300px" }}>
            <Text mb="sm">Template: </Text>
            <Title order={3} mb="sm">
              {selectedTemplate?.title || "Template"}
            </Title>
            <RateupButtonPrimary
              onClick={() =>
                router.push(
                  `/dashboard/surveys?action=create&tmp=${selectedTemplate?.id}&tn=${selectedTemplate?.title}`,
                )
              }
              title="Choose Template"
            />
          </Stack>
        </Group>
        {/* </Modal> */}
      </FormModalLayout>

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
          <Loader />{" "}
        </Box>
      )}

      {allTemplates && (
        <Box m="lg" pb="xl">
          {Object?.entries(allTemplates)?.length < 1 && (
            <Text m="100px">No templates found..!</Text>
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
    </>
  );
};

export default Templates;
