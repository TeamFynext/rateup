import { Tabs } from "@mantine/core";
import { useParams, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useImmer } from "use-immer";

import { useQuestions } from "@/backend/surveys/questions/questions.query";
import { useSurvey } from "@/backend/surveys/surveys.query";
import { useUpdateFlowMutation, useWaFlowFromDb } from "@/backend/whatsapp/flow/flow.query";
import { useRouteParams } from "@/context/RouteParamsContext.tsx";
import SelectedLanguageContext from "@/context/SelectedLanguage.ts";
import SurveyContext from "@/context/SurveyContext.ts";
import { useUser } from "@/context/UserContext.tsx";
import { QuestionType, WaFlowStatus } from "@/types/enums.ts";
import type { WaFlowJson, WaFlowMap } from "@/types/global";
import { UserRole } from "@/utils/enums/index.ts";
import { getUniqueRandomAlphaId } from "@/utils/misc/random.utils";
import {
  getFlowElementJsonFromQuestion,
  getNewScreenObj,
  getQuestionFromFlowFormElementName,
  getScreenObjById,
  updateFlowJsonNavigationAndDataPassing,
} from "@/utils/whatsapp/flow.utils";

import RateupLoader from "../../../Loaders/RateupLoader.tsx";
import StyledTabs from "../../../styled/StyledTabs/StyledTabs.tsx";
import Result from "../../../Survey/Result/Result.tsx";
import ResultComparison from "../../../Survey/Result/ResultComparison.tsx";
import SurveySettings from "../../../Survey/Settings/index.tsx";
import { ShareFlow } from "../../../Survey/ShareSurvey/ShareFlow.tsx";
import EditFlow from "./EditFlow/EditFlow.tsx";
import { EditFlowContext } from "./EditFlow/EditFlowContext.ts";
import FlowPageHeader, { FlowTabEnum } from "./FlowPageHeader/index.tsx";

function FlowPage() {
  const searchParams = useSearch({ strict: false });
  const tabView = searchParams.tab as FlowTabEnum;
  const params = useParams({
    strict: false,
  });
  const dbFlowId = params.dbFlowId as string;

  const { data: flow, isPending } = useWaFlowFromDb(dbFlowId);
  const { data: surveyData } = useSurvey(flow?.surveyId);
  const flowEditable = flow?.status === WaFlowStatus.DRAFT;

  const [flowJson, updateFlowJson] = useImmer<WaFlowJson>(undefined);
  const [survey, updateSurvey] = useImmer<Survey>(undefined); // survey created from flowJson which we will be using to parse responses of the flow
  const { data: questions } = useQuestions(survey?.id);
  const [map, updateMap] = useImmer<WaFlowMap>(undefined); // map of flowElementName to questionType & also responseId to corresponding response type or value

  const [selectedFormElementId, setSelectedFormElementId] = useState<string>(undefined); // if no question is selected, then show question types list in the right side
  const [selectedScreenId, setSelectedScreenId] = useState<string>(undefined); // if no screen is selected, then show screens list in the left side
  const [selectedLang] = useState("en");
  const [tab, setTab] = useState(FlowTabEnum.Edit);
  const [previewOpened, setPreviewOpened] = useState(true);
  const { update } = useRouteParams();

  // initial data
  useEffect(() => {
    if (!flowJson && flow?.json?.version) {
      updateFlowJson(() => flow.json);
    }
    if (!map && flow?.map) {
      updateMap(() => flow.map);
    }
    update({ dbFlowId: flow?.name });
  }, [flow, update]);

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
      toast.error("You can't edit a published flow.");
      return;
    }
    const timer = setTimeout(() => {
      updateFlowMutation.mutate({ dbFlowId, data: { json: flowJson, map } });
    }, 500);
    return () => clearTimeout(timer);
  }, [flowJson, flowEditable, dbFlowId, flow?.status, map]); // Add dependencies explicitly

  // update flowJson when there is a change in questions
  // or when there is a change in logicJumps
  useEffect(() => {
    if (!flowEditable) return;
    if (questions && flowJson) {
      updateSurvey((draft) => {
        draft.questions = questions;
      });
      updateFlowJson((draft) => {
        if (!flowJson.screens && questions?.length > 2) {
          {
            const id = getUniqueRandomAlphaId(6, []);
            draft.screens = [
              getNewScreenObj({
                screenId: id,
                screenTitle: "screen1",
                footerBtnLabel: "Next",
              }),
            ];
            updateFlowJsonNavigationAndDataPassing(draft, flow);
            questions
              ?.filter((data) => Object.values(QuestionType).includes(data.type as QuestionType))
              .forEach((newQ) => {
                const newElement = {
                  type: newQ.type as any,
                  name: newQ.id,
                  id: newQ.id,
                  label: newQ.label,
                };
                const screenToBeEdited = getScreenObjById(draft.screens, id);
                screenToBeEdited.layout.children
                  .find((se) => se.type === "Form")
                  .children.push(newElement as any);
                updateFlowJsonNavigationAndDataPassing(draft, flow);
              });
          }
        }
        if (!draft.screens) draft.screens = [];
        for (const screen of draft?.screens) {
          const form = screen.layout.children.find((se) => se.type === "Form");
          for (let i = 0; i < form?.children?.length; i++) {
            const fe = form.children[i];
            const question = getQuestionFromFlowFormElementName(fe.name, questions, map);
            if (question) {
              const {
                formElements: { questionElement },
              } = getFlowElementJsonFromQuestion(question);
              questionElement.name = fe.name;
              form.children[i] = questionElement;
            }
          }
        }
        updateFlowJsonNavigationAndDataPassing(draft, flow);
      });
    }
  }, [questions, flow]);
  // surveyId start
  // Things common to [surveyId].tsx
  const { user } = useUser();

  const [selectedLanguage, setSelectedLanguage] = useState(null);
  const [, setdefaultLanguage] = useState(null);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [selectedTeamName, setSelectedTeamName] = useState("");
  const [surveyTeamMapId, setSurveyTeamMapId] = useState("");
  const [teamOptions, setTeamOptions] = useState([]);
  const [filterTeams, setFilterTeams] = useState([]);
  const [filterTags] = useState([]);
  const [screenNumber, setScreenNumber] = useState(0);
  useEffect(() => {
    if (user?.role === UserRole.MEMBER) {
      setTab(FlowTabEnum.Responses);
    }
  }, [survey]);

  useEffect(() => {
    if (tabView && Object.values(FlowTabEnum).includes(tabView)) {
      setTab(tabView);
    }
  }, [tabView]);

  useEffect(() => {
    teamOptions && setSelectedTeamId(teamOptions[0]?.value);
  }, [teamOptions]);
  useEffect(() => {
    if (survey) {
      if (tab !== FlowTabEnum.Responses) {
        setSelectedLanguage(selectedLanguage ? selectedLanguage : survey?.languages?.[0]);
      } else {
        setSelectedLanguage("");
      }
      setdefaultLanguage(survey?.languages?.[0]);
      const options = survey?.teams?.map((team) => ({
        value: team?.id,
        label: team?.name,
      }));
      setTeamOptions(options);
    }
  }, [survey, tab]);

  useEffect(() => {
    if (selectedTeamId) {
      setSurveyTeamMapId(survey?.teams?.find((team) => team.id === selectedTeamId)?.mapId);
      setSelectedTeamName(survey?.teams?.find((team) => team.id === selectedTeamId)?.name);
    }
  }, [selectedTeamId]);

  // surveyId end

  if (isPending || !flow || !flowJson || !survey) return <RateupLoader />;

  return (
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
      <SelectedLanguageContext.Provider value={{ selectedLanguage: "en", defaultLanguage: "en" }}>
        <div className="relative h-full">
          <div className="flex flex-col h-full">
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
                teams: teamOptions,
              }}
            >
              <FlowPageHeader
                name={flow.name}
                tab={tab}
                setTabState={setTab}
                previewOpened={previewOpened}
                setPreviewOpened={setPreviewOpened}
              />
              <StyledTabs
                className="flex-1 overflow-hidden"
                keepMounted={false}
                value={tab}
                h={"100%"}
              >
                <Tabs.Panel value={FlowTabEnum.Edit} h={"100%"}>
                  <EditFlow previewOpened={previewOpened} setPreviewOpened={setPreviewOpened} />
                </Tabs.Panel>
                <Tabs.Panel value={FlowTabEnum.Settings}>
                  <SurveySettings
                    surveyId={survey.id}
                    survey={survey}
                    enabledModules={["teams", "flow"]}
                    flowName={flow.name}
                    flowDbId={flow.dbFlowId}
                    anonymous={flow?.anonymous}
                  />
                </Tabs.Panel>
                <Tabs.Panel value={FlowTabEnum.Responses}>
                  <Result
                    encryptionpassword={""}
                    setEncryptionPassword={() => {}}
                    survey={survey}
                    flowId={flow.flowId}
                  />
                </Tabs.Panel>
                <Tabs.Panel value={FlowTabEnum.Share}>
                  <ShareFlow allowUnpublishedShare={true} />
                </Tabs.Panel>
                <Tabs.Panel value={FlowTabEnum.Analytics}>
                  <div className="p-6 text-center text-gray-500">
                    Analytics content coming soon...
                  </div>
                </Tabs.Panel>
                <Tabs.Panel value={FlowTabEnum.TeamAnalytics}>
                  <ResultComparison
                    surveyId={survey.id}
                    version={2}
                    flowQuestions={survey.questions}
                    questions={survey.questions}
                  />
                </Tabs.Panel>
              </StyledTabs>
            </SurveyContext.Provider>
          </div>
        </div>
      </SelectedLanguageContext.Provider>
    </EditFlowContext.Provider>
  );
}

export default FlowPage;
