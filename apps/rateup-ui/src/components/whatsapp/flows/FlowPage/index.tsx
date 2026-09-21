import { useParams, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useImmer } from "use-immer";

import { useQuestions } from "@/backend/surveys/questions/questions.query";
import { useSurvey } from "@/backend/surveys/surveys.query";
import { useUpdateFlowMutation, useWaFlowFromDb } from "@/backend/whatsapp/flow/flow.query";
import { TabsContent } from "@/components/ui/tabs.tsx";
import { useRouteParams } from "@/context/RouteParamsContext.tsx";
import SelectedLanguageContext from "@/context/SelectedLanguage.ts";
import SurveyContext from "@/context/SurveyContext.ts";
import { usePermissions } from "@/hooks/usePermission.ts";
import { QuestionType, WaFlowStatus } from "@/types/enums.ts";
import type { WaFlowFormElement } from "@/types/global";
import type { WaFlowJson, WaFlowMap, WaFlowScreen } from "@/types/global";
import { getUniqueRandomAlphaId } from "@/utils/misc/random.utils";
import {
  getFlowElementJsonFromQuestion,
  getFlowJsonWithTitleAndDescription,
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
import { FlowPreviewPhoneContent } from "../Preview/PreviewPanel.tsx";
import EditFlow from "./EditFlow/EditFlow.tsx";
import type { IEditFlowContext } from "./EditFlow/EditFlowContext.ts";
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
  const { data: surveyData } = useSurvey(flow?.surveyId ?? "");
  const flowEditable = flow?.status === WaFlowStatus.DRAFT;

  const [flowJson, updateFlowJson] = useImmer<WaFlowJson | undefined>(undefined);
  const [survey, updateSurvey] = useImmer<Survey | undefined>(undefined); // survey created from flowJson which we will be using to parse responses of the flow
  const { data: questions } = useQuestions(survey?.id ?? "");
  const [map, updateMap] = useImmer<WaFlowMap | undefined>(undefined); // map of flowElementName to questionType & also responseId to corresponding response type or value

  const [selectedFormElementId, setSelectedFormElementId] = useState<string | undefined>(undefined); // if no question is selected, then show question types list in the right side
  const [selectedScreenId, setSelectedScreenId] = useState<string | undefined>(undefined); // if no screen is selected, then show screens list in the left side
  const [selectedLang] = useState("en");
  const [tab, setTab] = useState(FlowTabEnum.Edit);
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
        draft!.questions = questions;
      });
      updateFlowJson((draft) => {
        // The guard above proves both the draft and the questions are loaded.
        if (!draft) return;
        if (!flowJson.screens && (questions?.length ?? 0) > 2) {
          {
            const id = getUniqueRandomAlphaId(6, []);
            draft.screens = [
              getNewScreenObj({
                screenId: id,
                screenTitle: "screen1",
                footerBtnLabel: "Next",
              }),
            ];
            updateFlowJsonNavigationAndDataPassing(draft, flow!);
            questions
              ?.filter((data) => Object.values(QuestionType).includes(data.type as QuestionType))
              .forEach((newQ) => {
                // The legacy "seed a flow from a survey" path stores the survey question's own
                // type and its per-language label on the element; the flow editor normalises
                // both later, so they are written through as they are.
                const newElement = Object.assign({} as WaFlowFormElement, {
                  type: newQ.type,
                  name: newQ.id,
                  id: newQ.id,
                  label: newQ.label,
                });
                const screenToBeEdited = getScreenObjById(draft.screens, id)!;
                screenToBeEdited.layout.children
                  .find((se) => se.type === "Form")!
                  .children.push(newElement);
                updateFlowJsonNavigationAndDataPassing(draft, flow!);
              });
          }
        }
        if (!draft.screens) draft.screens = [];
        for (const screen of draft.screens) {
          const form = screen.layout.children.find((se) => se.type === "Form");
          for (let i = 0; i < (form?.children?.length ?? 0); i++) {
            const fe = form!.children[i]!;
            const question = getQuestionFromFlowFormElementName(fe.name ?? "", questions!, map!);
            if (question) {
              const {
                formElements: { questionElement },
              } = getFlowElementJsonFromQuestion(question);
              questionElement.name = fe.name;
              form!.children[i] = questionElement;
            }
          }
        }
        updateFlowJsonNavigationAndDataPassing(draft, flow);
      });
    }
  }, [questions, flow]);
  // surveyId start
  // Things common to [surveyId].tsx
  const canManageFlows = usePermissions().can("flows.manage");

  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [, setdefaultLanguage] = useState<string | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [selectedTeamName, setSelectedTeamName] = useState("");
  const [surveyTeamMapId, setSurveyTeamMapId] = useState("");
  const [teamOptions, setTeamOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [filterTeams, setFilterTeams] = useState<string[]>([]);
  const [filterTags] = useState<string[]>([]);
  const [screenNumber, setScreenNumber] = useState(0);
  useEffect(() => {
    if (!canManageFlows) {
      setTab(FlowTabEnum.Responses);
    }
  }, [survey]);

  useEffect(() => {
    if (tabView && Object.values(FlowTabEnum).includes(tabView)) {
      setTab(tabView);
    }
  }, [tabView]);

  useEffect(() => {
    if (teamOptions) setSelectedTeamId(teamOptions[0]?.value ?? "");
  }, [teamOptions]);
  useEffect(() => {
    if (survey) {
      if (tab !== FlowTabEnum.Responses) {
        setSelectedLanguage(selectedLanguage ? selectedLanguage : (survey?.languages?.[0] ?? null));
      } else {
        setSelectedLanguage("");
      }
      setdefaultLanguage(survey?.languages?.[0] ?? null);
      const options = survey?.teams?.map((team) => ({
        value: team?.id,
        label: team?.name,
      }));
      setTeamOptions(options);
    }
  }, [survey, tab]);

  useEffect(() => {
    if (selectedTeamId) {
      setSurveyTeamMapId(survey?.teams?.find((team) => team.id === selectedTeamId)?.mapId ?? "");
      setSelectedTeamName(survey?.teams?.find((team) => team.id === selectedTeamId)?.name ?? "");
    }
  }, [selectedTeamId]);

  // surveyId end

  if (isPending || !flow || !flowJson || !survey || !map) return <RateupLoader />;

  let currentPreviewScreen: WaFlowScreen | undefined;
  if (flowJson.screens?.length) {
    const json = getFlowJsonWithTitleAndDescription(flowJson, map, survey);
    currentPreviewScreen = json.screens?.[screenNumber ?? 0];
  }

  return (
    <EditFlowContext.Provider
      // The guard above proves every field below is loaded; the immer updaters
      // still carry the `| undefined` of their seed state.
      value={
        {
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
        } as IEditFlowContext
      }
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
                phonePreview={
                  <FlowPreviewPhoneContent currentScreen={currentPreviewScreen} version={1} />
                }
              />
              <StyledTabs className="flex-1 overflow-hidden" value={tab}>
                <TabsContent value={FlowTabEnum.Edit} className="h-full">
                  <EditFlow />
                </TabsContent>
                <TabsContent value={FlowTabEnum.Settings}>
                  <SurveySettings
                    surveyId={survey.id}
                    survey={survey}
                    enabledModules={["teams", "flow"]}
                    flowName={flow.name}
                    flowDbId={flow.dbFlowId}
                    anonymous={flow?.anonymous}
                  />
                </TabsContent>
                <TabsContent value={FlowTabEnum.Responses}>
                  <Result
                    encryptionpassword={""}
                    setEncryptionPassword={() => {}}
                    survey={survey}
                  />
                </TabsContent>
                <TabsContent value={FlowTabEnum.Share}>
                  <ShareFlow allowUnpublishedShare={true} />
                </TabsContent>
                <TabsContent value={FlowTabEnum.Analytics}>
                  <div className="p-6 text-center text-muted-foreground">
                    Analytics content coming soon...
                  </div>
                </TabsContent>
                <TabsContent value={FlowTabEnum.TeamAnalytics}>
                  <ResultComparison
                    surveyId={survey.id}
                    version={2}
                    flowQuestions={survey.questions}
                    questions={survey.questions}
                  />
                </TabsContent>
              </StyledTabs>
            </SurveyContext.Provider>
          </div>
        </div>
      </SelectedLanguageContext.Provider>
    </EditFlowContext.Provider>
  );
}

export default FlowPage;
