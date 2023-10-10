import {
  Group,
  Loader,
  Select,
  Tabs,
  Title,
  Space,
  Badge,
} from "@mantine/core";
import { useEffect, useState } from "react";
import SelectedLanguageContext from "../../../context/SelectedLanguage";
import { useRouter } from "next/router";
import { EditSurvey } from "../../../components/Survey/EditSurvey";
import { useSurvey } from "../../../backend/surveys/surveys.query";
import { useQuestions } from "../../../backend/surveys/questions/questions.query";
import ShareSurvey from "../../../components/Survey/ShareSurvey/ShareSurvey";
import StyledTabs from "../../../components/styled/StyledTabs";
import {
  RateupButtonBlackOutline,
  RateupButtonPrimary,
} from "../../../components/Button/RateupButtons";
import { IconChevronDown } from "@tabler/icons-react";
import { useRouteParams } from "../../../context/RouteParamsContext";
import SurveySettings from "../../../components/Survey/Settings/SurveySettings";
import Result from "../../../components/Survey/Result/Result";
import { useUser } from "../../../context/UserContext";
import SurveyTheme from "../../../components/Survey/SurveyTheme/SurveyTheme";
import { GetServerSidePropsContext } from "next";
import supertokensNode from "supertokens-node";
import { backendConfig } from "../../../config/backendConfig";
import { getSurveyWithCustomToken } from "../../../backend/surveys/survey.api";
import { getQuestionsWithCustomToken } from "../../../backend/surveys/questions/questions.api";
import { checkTokenExpiry } from "../../../utils/supertoken";

enum TabEnum {
  Edit = "Edit",
  Share = "Share",
  Result = "Result",
  Settings = "Settings",
  Theme = "Theme",
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  try {
    supertokensNode.init(backendConfig());
    const { surveyId } = context.params as { surveyId: string };

    let accessToken =
      context.req.cookies["st-access-token"] ||
      context.req.cookies["sAccessToken"];
    if (!accessToken) {
      return { props: { surveyData: [], questionsData: [] } };
    }

    const surveyData = await getSurveyWithCustomToken(accessToken, {
      surveyId,
    });
    const questionsData = await getQuestionsWithCustomToken(accessToken, {
      surveyId,
    });

    const tokenExpiryCheck = checkTokenExpiry([surveyData, questionsData]);
    if (tokenExpiryCheck) {
      return tokenExpiryCheck;
    }

    return {
      props: {
        surveyData: surveyData || null,
        questionsData: questionsData || null,
      },
    };
  } catch (err) {
    console.log(err);
    return {
      props: {
        surveyData: [],
        questionsData: [],
      },
    };
  }
}

export default ({
  surveyData: surveyInitial,
  questionsData: questionsinitial,
}) => {
  const router = useRouter();
  const { surveyId } = router.query;
  const { tab } = router.query;
  const { user } = useUser();

  if (Array.isArray(surveyId)) {
    throw new Error("surveyId is an array");
  }

  const {
    isLoading: isSurveyLoading,
    error: surveyError,
    data: survey,
  } = useSurvey(surveyId, surveyInitial);

  const {
    isLoading,
    error,
    data: questions,
  } = useQuestions(surveyId, questionsinitial);

  const { update } = useRouteParams();
  useEffect(() => {
    update({ surveyId: survey?.title });
  }, [survey?.title]);

  const [selectedLanguage, setSelectedLanguage] = useState(null);
  const [activeTab, setActiveTab] = useState<TabEnum | null>(TabEnum.Edit);
  const [addQnTrigger, setaddQnTrigger] = useState(0);

  useEffect(() => {
    user?.role === "MEMBER" &&
      router.push(
        `${process.env.NEXT_PUBLIC_FRONTEND_URL}/dashboard/surveys/responses/${surveyId}`,
      );
  }, [user]);

  useEffect(() => {
    if (tab && Object.values(TabEnum).includes(tab as any)) {
      setActiveTab(tab as any);
    }
  }, [tab]);

  useEffect(() => {
    if (survey) {
      setSelectedLanguage(survey?.languages?.[0]);
    }
  }, [survey]);

  if (isLoading || isSurveyLoading) return <Loader />;
  if (error || surveyError) {
    console.log(error, surveyError);
    return "An error has occurred";
  }

  return (
    <SelectedLanguageContext.Provider value={{ selectedLanguage }}>
      <StyledTabs
        value={activeTab}
        onChange={(tab) => setActiveTab(tab as TabEnum)}
      >
        <Group justify={"space-between"}>
          <Group justify={"space-between"} style={{ minWidth: "70%" }}>
            <Title
              order={1}
              mb="sm"
              pr="xl"
              style={{
                maxWidth: "50%",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
              title={survey.title}
            >
              {survey.title}
            </Title>

            <Tabs.List>
              <Tabs.Tab value={TabEnum.Edit}>Edit</Tabs.Tab>
              {survey.type != "whatsapp" && (
                <Tabs.Tab value={TabEnum.Theme}>Welcome Page</Tabs.Tab>
              )}
              <Tabs.Tab value={TabEnum.Settings}>Settings</Tabs.Tab>
              <Tabs.Tab value={TabEnum.Share}>Share</Tabs.Tab>
              <Tabs.Tab value={TabEnum.Result}>Result</Tabs.Tab>
            </Tabs.List>
          </Group>

          {activeTab === TabEnum.Edit && (
            <Group>
              <Badge
                color={
                  survey?.type == "web" ? "var(--tertiary-color)" : "green"
                }
                p="sm"
              >
                {survey.type}
              </Badge>
              <Select
                style={{ maxWidth: "150px" }}
                data={survey.languages}
                value={selectedLanguage}
                onChange={setSelectedLanguage}
              />
            </Group>
          )}
          {activeTab === TabEnum.Result && (
            <Group>
              <RateupButtonBlackOutline
                title={"All"}
                radius={"lg"}
                size="md"
                rightIcon={<IconChevronDown size="1rem" />}
              />
              <RateupButtonPrimary
                title={"Filter"}
                variant="subtle"
                rightIcon={<IconChevronDown size="1rem" />}
              />
            </Group>
          )}
        </Group>
        <Space h="lg" />
        <Tabs.Panel
          value={TabEnum.Edit}
          style={{ background: "white", width: "100%" }}
        >
          <EditSurvey
            questions={questions}
            addQnTrigger={addQnTrigger}
            surveyLanguages={survey.languages}
            setSelectedLanguage={setSelectedLanguage}
          />
        </Tabs.Panel>
        <Tabs.Panel value={TabEnum.Settings}>
          <SurveySettings surveyId={surveyId} survey={survey} />
        </Tabs.Panel>
        <Tabs.Panel value={TabEnum.Result}>
          <Result survey={survey} />
        </Tabs.Panel>
        <Tabs.Panel value={TabEnum.Share}>
          <ShareSurvey survey={survey} />
        </Tabs.Panel>
        <Tabs.Panel value={TabEnum.Theme}>
          <SurveyTheme survey={survey} />
        </Tabs.Panel>
      </StyledTabs>
    </SelectedLanguageContext.Provider>
  );
};
