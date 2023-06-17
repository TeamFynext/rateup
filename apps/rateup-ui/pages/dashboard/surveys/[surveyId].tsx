import { Box, Group, Loader, Select, Stack, Tabs, Title, Space, Grid, Paper, Text, ActionIcon, Tooltip, Input } from "@mantine/core";
import { useEffect, useState } from "react";
import SelectedLanguageContext from "../../../context/SelectedLanguage";
import { useRouter } from "next/router";
import { EditSurvey } from "../../../components/Survey/EditSurvey";
import { Responses } from "../../../components/Survey/Response/Responses";
import { useSurvey } from "../../../backend/surveys/surveys.query";
import { useQuestions } from "../../../backend/surveys/questions/questions.query";
import ShareSurvey from "../../../components/Survey/ShareSurvey/ShareSurvey";
import StyledTabs from "./StyledTabs";
import { RateupButtonBlackOutline, RateupButtonPrimary } from "../../../components/Button/RateupButtons";
import { IconChevronDown, IconPlus, IconSearch, IconShare3 } from "@tabler/icons-react";
import { useRouteParams } from "../../../context/RouteParamsContext";

enum TabEnum {
  Edit = "Edit",
  Share = "Share",
  Responses = "Responses",
}
export default () => {
  const router = useRouter();
  const { surveyId } = router.query;

  if (Array.isArray(surveyId)) {
    throw new Error("surveyId is an array");
  }

  const {
    isLoading: isSurveyLoading,
    error: surveyError,
    data: survey,
  } = useSurvey(surveyId);

  const { isLoading, error, data: questions } = useQuestions(surveyId);

  const { update } = useRouteParams();
  useEffect(() => {
    update({ surveyId: survey?.title });
  }, [survey?.title])

  const [selectedLanguage, setSelectedLanguage] = useState(null);
  const [activeTab, setActiveTab] = useState<TabEnum | null>(TabEnum.Edit);
  const [addQnTrigger, setaddQnTrigger] = useState(0)
  const [responseCount, setResponseCount] = useState(0)

  useEffect(() => {
    if (survey) {
      setSelectedLanguage(survey.languages[0]);
    }
  }, [survey]);

  if (isLoading || isSurveyLoading) return <Loader />;
  if (error || surveyError) {
    console.log(error, surveyError);
    return "An error has occurred";
  }

  return (
    <SelectedLanguageContext.Provider value={{ selectedLanguage }}>
      <Stack sx={{ height: "100%" }} >
        <StyledTabs
          value={activeTab}
          onTabChange={(tab) => setActiveTab(tab as TabEnum)}
        >
          <Group position="apart">
            <Title order={1} mb="sm">{survey.title}</Title>

            <Tabs.List
              sx={{
                position: "absolute",
                width: "fit-content",
                left: 0,
                right: 0,
                marginLeft: "auto",
                marginRight: "auto",
              }}
            >
              <Tabs.Tab value={TabEnum.Edit}>Edit</Tabs.Tab>
              <Tabs.Tab value={TabEnum.Share}>Share</Tabs.Tab>
              <Tabs.Tab value={TabEnum.Responses}>Responses</Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value={TabEnum.Edit}>
              <Group>
                <Select
                    data={survey.languages}
                    value={selectedLanguage}
                    onChange={setSelectedLanguage}
                  />

                  <RateupButtonPrimary onClick={() => {setaddQnTrigger(addQnTrigger+1)}} title={"Add Question"}
                        rightIcon={<IconPlus
                          size="1rem" />}
                          size="md"
                    />
              </Group>
  
            </Tabs.Panel>
            
            <Tabs.Panel value={TabEnum.Share}>
              <div></div>
            </Tabs.Panel>

            <Tabs.Panel value={TabEnum.Responses}>
                <RateupButtonBlackOutline 
                  title={"All"} 
                  size="md"
                  rightIcon={<IconChevronDown
                    size="1rem" />}
                />
                <RateupButtonPrimary
                        title={"Filter"}
                        variant="subtle"
                        rightIcon={<IconChevronDown
                            size="1rem" />}
                    />
            </Tabs.Panel>
          </Group>

          <Space h="xl" />
          
          <Tabs.Panel value={TabEnum.Edit}>
            {/** TODO: Remove fixed height and make this responsive */}
            <Box sx={{ display: "flex", gap: 30, height: "70vh" }}>
              <EditSurvey questions={questions} addQnTrigger={addQnTrigger} />
            </Box>
          </Tabs.Panel>
          <Tabs.Panel value={TabEnum.Responses}>
          <Grid grow mb={15} align="center">
              <Grid.Col span={3} > 
                <RateupButtonBlackOutline 
                  title={"Responses"} 
                  size="md"
                  rightIcon={<IconChevronDown
                    size="1rem" />}
                />
              </Grid.Col>
              <Grid.Col span={5}>
                <Text fz="xxl" fw={600}>Responses</Text>
              </Grid.Col>
            </Grid>
          <Paper p="xl" shadow="lg" radius="lg" sx={{ cursor: "pointer" }} mb={30}>
            <Grid justify="space-between" align="center">
              <Grid.Col span={3}><Title order={2}>Total Responses : {responseCount}</Title></Grid.Col>
              <Grid.Col span={3}>
                <Group>
                <Input
                     icon={<IconSearch size={16} />}
                    variant="filled"
                    placeholder="Search responses"
                    radius="xl"
                    size="sm"
                    styles={(theme) => ({
                      input: {
                        borderColor: theme.colors.yellow[theme.fn.primaryShade()],
                        borderWidth: 1,
                        borderStyle: 'solid',
                      },
                    })}
                  />
               <Tooltip label="Share">
                  <ActionIcon variant="default"><IconShare3 size="2rem" /></ActionIcon>
                </Tooltip>
                </Group>

            </Grid.Col>
            </Grid>
          </Paper>

            <Responses setResponseCount={setResponseCount} />
          </Tabs.Panel>
          <Tabs.Panel value={TabEnum.Share}>
            <ShareSurvey />
          </Tabs.Panel>
        </StyledTabs>
      </Stack>
    </SelectedLanguageContext.Provider>
  );
};
