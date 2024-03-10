import {
  Box,
  Center,
  Group,
  Paper,
  ScrollArea,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  Title,
} from "@mantine/core";
import React, { useEffect, useState } from "react";
import FormModalLayout from "../Modal/FormModalLayout";
import {
  RateupButtonPrimary,
  RateupButtonSecondary,
} from "../Button/RateupButtons";
import { useSurveyTemplates } from "../../backend/surveys/surveys.query";
import { ImageWithThumb } from "./Template/ImageWithThumb";
import { IconFileBroken, IconListDetails } from "@tabler/icons-react";

const SurveyTemplatesModal = ({
  opened,
  close,
  openCreateSurvey,
  setTemplate,
  surveyType,
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [categorires, setCategorires] = useState([]);
  const Steps = {
    STEP1: "Step 1",
    STEP2: "Step 2",
  };
  const [currentStep, setCurrentStep] = useState(Steps.STEP1);

  const {
    isLoading,
    error,
    data: allTemplates,
    refetch,
  } = useSurveyTemplates(surveyType);

  useEffect(() => {
    allTemplates && setCategorires(Object?.keys(allTemplates));
  }, [allTemplates]);

  useEffect(() => {
    if (opened === false) setSelectedTemplate(null);
    setCurrentStep(Steps.STEP1);
  }, [opened]);

  const bgTemp = {
    backgroundColor: "#fff",
  };

  return (
    <Box>
      <FormModalLayout
        opened={opened}
        title="Create Survey"
        onClose={close}
        centered
        size="auto"
      >
        {currentStep === Steps.STEP1 ? (
          <Stack
            style={{ height: "150px", minWidth: "300px" }}
            gap={20}
            justify="center"
          >
            <RateupButtonPrimary
              onClick={() => {
                setTemplate(null);
                close();
                openCreateSurvey();
              }}
              size="md"
              variant="outline"
              title="Start Blank"
              leftIcon={<IconFileBroken size={20} />}
            />

            <RateupButtonPrimary
              title="Choose Template"
              size="md"
              variant="outline"
              color="var(--tertiary-color)"
              leftIcon={<IconListDetails size={20} />}
              onClick={() => setCurrentStep(Steps.STEP2)}
            />
          </Stack>
        ) : (
          <Stack
            style={{ height: "500px", minWidth: "800px" }}
            justify="space-between"
          >
            <Stack>
              <Title order={3} mb="sm">
                Choose Template
              </Title>
              <Group
                justify="center"
                style={{ maxHeight: "450px", minHeight: "400px" }}
              >
                {categorires.length > 0 ? (
                  <Tabs
                    defaultValue={categorires[0] || null}
                    orientation="vertical"
                  >
                    <Box style={{ minWidth: "200px" }}>
                      <Tabs.List>
                        {categorires &&
                          categorires?.map((category) => (
                            <Tabs.Tab key={category} value={category}>
                              {category}
                            </Tabs.Tab>
                          ))}
                      </Tabs.List>
                    </Box>
                    <ScrollArea h={400}>
                      {allTemplates &&
                        Object?.keys(allTemplates)?.map((category, i) => (
                          <Box key={i} style={{ minWidth: "400px" }}>
                            <Tabs.Panel key={category} value={category}>
                              <SimpleGrid cols={2}>
                                {allTemplates[category]?.map((survey, j) => (
                                  <Stack
                                    m="md"
                                    key={j}
                                    style={{
                                      padding: "15px",
                                      borderRadius: "10px",
                                      border:
                                        selectedTemplate?.id === survey?.id
                                          ? "2px solid var(--tertiary-color)"
                                          : "2px solid #fff",
                                    }}
                                  >
                                    <Paper
                                      radius={"lg"}
                                      shadow="md"
                                      mr="md"
                                      onClick={() => {
                                        setSelectedTemplate(survey);
                                      }}
                                      style={{
                                        ...(survey?.WelcomeTheme?.bgType ===
                                        "bgcolor"
                                          ? survey?.WelcomeTheme?.bgStyles
                                          : bgTemp),
                                        width: "230px",
                                        height: "150px",
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
                                      <Text style={{ maxWidth: "200px" }}>
                                        {survey?.title}
                                      </Text>
                                    </Center>
                                  </Stack>
                                ))}
                              </SimpleGrid>
                            </Tabs.Panel>
                          </Box>
                        ))}
                    </ScrollArea>
                  </Tabs>
                ) : (
                  <Text m="xl">"No templates available." </Text>
                )}
              </Group>
            </Stack>
            <Group justify="space-between">
              <Group
                justify="center"
                style={{ width: "170px", minWidth: "170px" }}
              >
                <RateupButtonPrimary
                  onClick={() => {
                    setTemplate(null);
                    close();
                    openCreateSurvey();
                  }}
                  fullWidth
                  title="Start Blank"
                />
              </Group>

              <Group>
                <RateupButtonSecondary
                  title="Cancel"
                  size="sm"
                  variant="outline"
                  color="var(--tertiary-color)"
                  onClick={close}
                />
                <RateupButtonPrimary
                  onClick={() => {
                    setTemplate(selectedTemplate);
                    close();
                    openCreateSurvey();
                  }}
                  title="Start"
                  disabled={!selectedTemplate || categorires.length < 1}
                />
              </Group>
            </Group>
          </Stack>
        )}
      </FormModalLayout>
    </Box>
  );
};

export default SurveyTemplatesModal;
