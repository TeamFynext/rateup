import { useRouter } from "next/router";
import styles from "./FlowPage.module.css";
import { Box, MantineProvider, Tabs } from "@mantine/core";
import { whatsappTheme } from "../../../../config/mantineTheme";
import FlowPageHeader, { FlowTabEnum } from "./FlowPageHeader";
import { useEffect, useState } from "react";
import {
  useUpdateFlowMutation,
  useWaFlowFromDb,
} from "../../../../backend/whatsapp/flow/flow.query";
import EditFlow from "./EditFlow/EditFlow";
import { useImmer } from "use-immer";
import { useQuestions } from "../../../../backend/surveys/questions/questions.query";
import { useSurvey } from "../../../../backend/surveys/surveys.query";
import { WaFlowStatus } from "../../../../types/enums";
import { WaFlowJson, WaFlowMap } from "../../../../types/global";
import SurveySettings from "../../../Survey/Settings";
import {
  getFlowElementJsonFromQuestion,
  updateFlowJsonNavigationAndDataPassing,
  getQuestionFromFlowFormElementName,
} from "../../../../utils/whatsapp/flow.utils";
import { EditFlowContext } from "./EditFlow/EditFlowContext";
import SelectedLanguageContext from "../../../../context/SelectedLanguage";
import Result from "../../../Survey/Result/Result";
import SurveyContext from "../../../../context/SurveyContext";
import { useUser } from "../../../../context/UserContext";
import { UserRole } from "../../../../utils/enums";
import { showErrorToast } from "../../../../utils/notifications";
import { ShareFlow } from "../../../Survey/ShareSurvey/ShareFlow";
import StyledTabs from "../../../styled/StyledTabs/StyledTabs";
import RateupLoader from "../../../Loaders/RateupLoader";

function FlowPage() {
  const router = useRouter();
  const { tab: tabView } = router.query;
  const { dbFlowId } = router.query as { dbFlowId: string };
  const { data: flow, isPending } = useWaFlowFromDb(dbFlowId);
  const { data: surveyData } = useSurvey(flow?.surveyId);
  const flowEditable = flow?.status === WaFlowStatus.DRAFT;

  const [flowJson, updateFlowJson] = useImmer<WaFlowJson>(undefined);
  const [survey, updateSurvey] = useImmer<Survey>(undefined); // survey created from flowJson which we will be using to parse responses of the flow
  const { data: questions } = useQuestions(survey?.id);
  const [map, updateMap] = useImmer<WaFlowMap>(undefined); // map of flowElementName to questionType & also responseId to corresponding response type or value

  const [selectedFormElementId, setSelectedFormElementId] =
    useState<string>(undefined); // if no question is selected, then show question types list in the right side
  const [selectedScreenId, setSelectedScreenId] = useState<string>(undefined); // if no screen is selected, then show screens list in the left side
  const [selectedLang, setSelectedLang] = useState("en");
  const [tab, setTab] = useState(FlowTabEnum.Edit);

  // initial data
  useEffect(() => {
    if (!flowJson && flow?.json?.version) {
      updateFlowJson(() => flow.json);
    }
    if (!map && flow?.map) {
      updateMap(() => flow.map);
    }
  }, [flow]);
  useEffect(() => {
    if (surveyData) {
      updateSurvey(() => surveyData);
    }
  }, [surveyData]);

  const updateFlowMutation = useUpdateFlowMutation();

  // autoSave
  useEffect(() => {
    if (!flowEditable || !flowJson) return;
    if (flow.status === WaFlowStatus.PUBLISHED) {
      showErrorToast("You can't edit a published flow.");
      return;
    }
    const timer = setTimeout(() => {
      updateFlowMutation.mutate({ dbFlowId, data: { json: flowJson, map } });
    }, 500);
    return () => clearTimeout(timer);
  }, [flowJson, flowEditable, dbFlowId, flow?.status, map]); // Add dependencies explicitly

  // update flowJson when there is a change in questions
  useEffect(() => {
    if (!flowEditable) return;
    if (questions && flowJson) {
      updateSurvey((draft) => {
        draft.questions = questions;
      });
      updateFlowJson((draft) => {
        for (const screen of draft.screens) {
          const form = screen.layout.children.find((se) => se.type === "Form");
          for (let i = 0; i < form.children.length; i++) {
            const fe = form.children[i];
            const question = getQuestionFromFlowFormElementName(
              fe.name,
              questions,
              map,
            );
            if (question) {
              const {
                formElements: { questionElement },
                map: updatedMap,
              } = getFlowElementJsonFromQuestion(question);
              questionElement.name = fe.name;
              form.children[i] = questionElement;
            }
          }
        }
        updateFlowJsonNavigationAndDataPassing(draft, flow);
      });
    }
  }, [questions]);

  // surveyId start
  // Things common to [surveyId].tsx
  const { user } = useUser();

  const [selectedLanguage, setSelectedLanguage] = useState(null);
  const [defaultLanguage, setdefaultLanguage] = useState(null);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [selectedTeamName, setSelectedTeamName] = useState("");
  const [surveyTeamMapId, setSurveyTeamMapId] = useState("");
  const [teamOptions, setTeamOptions] = useState([]);
  const [filterTeams, setFilterTeams] = useState([]);
  const [filterTags, setFilterTags] = useState([]);
  const [screenNumber, setScreenNumber] = useState(0);
  useEffect(() => {
    if (user?.role === UserRole.MEMBER) {
      setTab(FlowTabEnum.Result);
    }
  }, [survey]);

  useEffect(() => {
    if (tabView && Object.values(FlowTabEnum).includes(tabView as any)) {
      setTab(tabView as any);
    }
  }, [tabView]);

  useEffect(() => {
    teamOptions && setSelectedTeamId(teamOptions[0]?.value);
  }, [teamOptions]);
  useEffect(() => {
    if (survey) {
      if (tab !== FlowTabEnum.Result) {
        setSelectedLanguage(
          selectedLanguage ? selectedLanguage : survey?.languages?.[0],
        );
      } else {
        setSelectedLanguage("");
      }
      setdefaultLanguage(survey?.languages?.[0]);
      let options = survey?.teams?.map((team) => ({
        value: team?.id,
        label: team?.name,
      }));
      setTeamOptions(options);
    }
  }, [survey, tab]);

  useEffect(() => {
    if (selectedTeamId) {
      setSurveyTeamMapId(
        survey?.teams?.find((team) => team.id === selectedTeamId)?.mapId,
      );
      setSelectedTeamName(
        survey?.teams?.find((team) => team.id === selectedTeamId)?.name,
      );
    }
  }, [selectedTeamId]);

  //surveyId end

  if (isPending || !flow || !flowJson || !survey) return <RateupLoader />;

  return (
    <MantineProvider theme={whatsappTheme}>
      <EditFlowContext.Provider
        value={{
          flowJson,
          updateFlowJson,
          map,
          updateMap,
          survey,
          updateSurvey,
          selectedLang,
          selectedScreenId,
          setSelectedScreenId,
          setSelectedFormElementId,
          selectedFormElementId,
          screenNumber,
          setScreenNumber,
        }}
      >
        <SelectedLanguageContext.Provider
          value={{ selectedLanguage: "en", defaultLanguage: "en" }}
        >
          <Box className={styles["flow-page-container"]}>
            <Box className={styles["flow-page-content"]}>
              <SurveyContext.Provider
                value={{
                  encryptionpassword: "",
                  selectedTeamId,
                  surveyTeamMapId,
                  selectedTeamName,
                  filterTeams,
                  setFilterTeams,
                  filterTags,
                  surveyId: survey?.id,
                }}
              >
                <FlowPageHeader
                  name={flow.name}
                  tab={tab}
                  setTabState={setTab}
                />
                <StyledTabs keepMounted={false} value={tab} h={"100%"}>
                  <Tabs.Panel value={FlowTabEnum.Edit} h={"100%"}>
                    <EditFlow />
                  </Tabs.Panel>
                  <Tabs.Panel value={FlowTabEnum.Settings}>
                    <SurveySettings
                      surveyId={survey.id}
                      survey={survey}
                      enabledModules={["teams", "name-change"]}
                      flowName={flow.name}
                      flowDbId={flow.dbFlowId}
                    />
                  </Tabs.Panel>
                  <Tabs.Panel value={FlowTabEnum.Result}>
                    <Result
                      encryptionpassword={""}
                      setEncryptionPassword={() => {}}
                      survey={survey}
                      setSelectedLanguage={setSelectedLanguage}
                      setFilterTags={setFilterTags}
                      flowId={flow.flowId}
                    />
                  </Tabs.Panel>
                  <Tabs.Panel value={FlowTabEnum.Share}>
                    <ShareFlow allowUnpublishedShare={true} />
                  </Tabs.Panel>
                </StyledTabs>
              </SurveyContext.Provider>
            </Box>
          </Box>
        </SelectedLanguageContext.Provider>
      </EditFlowContext.Provider>
    </MantineProvider>
  );
}

export default FlowPage;
