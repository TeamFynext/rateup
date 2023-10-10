import {
  Loader,
  Tabs,
  Group,
  Title,
  Badge,
  Select,
  Space,
  MantineProvider,
} from "@mantine/core";
import { IconChevronDown } from "@tabler/icons-react";
import { GetServerSidePropsContext } from "next";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import supertokensNode from "supertokens-node";
import { getQuestionsWithCustomToken } from "../../../../backend/surveys/questions/questions.api";
import { useQuestions } from "../../../../backend/surveys/questions/questions.query";
import { useSurvey } from "../../../../backend/surveys/surveys.query";
import {
  RateupButtonBlackOutline,
  RateupButtonPrimary,
} from "../../../../components/Button/RateupButtons";
import Result from "../../../../components/Survey/Result/Result";
import ShareSurvey from "../../../../components/Survey/ShareSurvey/ShareSurvey";
import StyledTabs from "../../../../components/styled/StyledTabs";
import { backendConfig } from "../../../../config/backendConfig";
import { useRouteParams } from "../../../../context/RouteParamsContext";
import SelectedLanguageContext from "../../../../context/SelectedLanguage";
import { useUser } from "../../../../context/UserContext";
import { checkTokenExpiry } from "../../../../utils/supertoken";
import { getSurveyWithCustomToken } from "../../../../backend/surveys/survey.api";
import { getAccessTokenFromContext } from "../../../../utils/auth/token";
import { EditWhatsappSurvey } from "../../../../components/whatsapp/surveys/WaEditSurvey";
import { whatsappTheme } from "../../../../components/Promotion/promotion.config";

enum TabEnum {
  Edit = "Edit",
  Share = "Share",
  Result = "Result",
  Settings = "Settings",
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  try {
    supertokensNode.init(backendConfig());
    const { surveyId } = context.params as { surveyId: string };

    let accessToken = getAccessTokenFromContext(context);
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
    if (user?.role === "MEMBER") {
      router.push(
        `${process.env.NEXT_PUBLIC_FRONTEND_URL}/dashboard/whatsapp/surveys/responses/${surveyId}`,
      );
    }
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
    <MantineProvider theme={whatsappTheme}>
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
                  maxWidth: "350px",
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
            <EditWhatsappSurvey
              questions={questions}
              addQnTrigger={addQnTrigger}
              surveyLanguages={survey.languages}
              setSelectedLanguage={setSelectedLanguage}
            />
          </Tabs.Panel>
          <Tabs.Panel value={TabEnum.Settings}>
            <h2>whatsapp surveyy settings</h2>
          </Tabs.Panel>
          <Tabs.Panel value={TabEnum.Result}>
            <Result survey={survey} />
          </Tabs.Panel>
          <Tabs.Panel value={TabEnum.Share}>
            <ShareSurvey survey={survey} />
          </Tabs.Panel>
          {/* TODO  fix mantine issue and Enable - TODO VERIFY MANTINE*/}
        </StyledTabs>
      </SelectedLanguageContext.Provider>
    </MantineProvider>
  );
};
