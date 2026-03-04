"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

import { useTranslations } from "next-intl";

import { SubscriptionFeaturePathName } from "@/types/enums";
import { useSubscription } from "@/backend/subscription/subscription.query";
import { useSurvey } from "@/backend/surveys/surveys.query";
import { useWaFlowFromDb } from "@/backend/whatsapp/flow/flow.query";
import RateupLoader from "@/components/Loaders/RateupLoader";
import Result from "@/components/Survey/Result/Result";
import ResultComparison from "@/components/Survey/Result/ResultComparison";
import ResultsOverviewWebForm from "@/components/Survey/Result/ResultsOverviewWebForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EditFlow from "@/components/whatsapp/flow-v2/EditFlow";
import { EditFlowContext } from "@/components/whatsapp/flows/FlowPage/EditFlow/EditFlowContext";
import FlowPageHeader, {
  FlowTabEnum,
} from "@/components/whatsapp/flows/FlowPage/FlowPageHeader";
import FlowSettings from "@/components/whatsapp/flows/FlowSettings";
import FlowShare from "@/components/whatsapp/flows/FlowShare";
import { useRouteParams } from "@/context/RouteParamsContext";
import SurveyContext from "@/context/SurveyContext";
import { hasFeature } from "@/utils/subscription/subscription";

import styles from "../FlowPage.module.css";

const Flow = () => {
  const [tab, setTab] = useState(FlowTabEnum.Edit);
  const [previewOpened, setPreviewOpened] = useState(false);

  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [selectedTeamName, setSelectedTeamName] = useState("");
  const [surveyTeamMapId, setSurveyTeamMapId] = useState("");
  const [teamOptions, setTeamOptions] = useState([]);
  const [filterTeams, setFilterTeams] = useState([]);

  const params = useParams();
  const dbFlowId = params.dbFlowId as string;
  const searchParams = useSearchParams();
  const tabView = searchParams.get("tab") as string;

  const { data: flow, isPending } = useWaFlowFromDb(dbFlowId);
  const { data: survey, isPending: isSurveyPending } = useSurvey(
    flow?.surveyId,
  );
  const { data: subscription } = useSubscription();

  const flowQuestions = useMemo(() => {
    if (!flow?.json?.screens) return [];
    return flow.json.screens.flatMap((screen: any) =>
      screen.layout.children
        .filter((child: any) => child.type !== "Footer")
        .map(
          ({
            id,
            label,
            metaType,
            name,
            "data-source": dataSource,
            header,
          }: any) => ({
            id,
            label,
            metaType,
            dataSource,
            name,
            header,
          }),
        )
        .filter(({ name }: any) => name),
    );
  }, [flow]);

  const { update } = useRouteParams();
  const translations = useTranslations();
  useEffect(() => {
    update({ dbFlowId: flow?.name });
  }, [flow, update]);

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

  useEffect(() => {
    teamOptions && setSelectedTeamId(teamOptions?.[0]?.value);
  }, [teamOptions]);

  useEffect(() => {
    if (survey) {
      let options = survey?.teams?.map((team) => ({
        value: team?.id,
        label: team?.name,
      }));
      setTeamOptions(options);
    }
  }, [survey]);

  useEffect(() => {
    if (tabView && Object.values(FlowTabEnum).includes(tabView as any)) {
      setTab(tabView as any);
    }
  }, [tabView]);

  if (isPending || isSurveyPending) return <RateupLoader />;

  return (
    <div className={styles["flow-page-container"]}>
      <div className={styles["flow-page-content"]}>
        <EditFlowContext.Provider
          value={{
            flowJson: null,
            updateFlowJson: null,
            map: null,
            updateMap: null,
            survey,
            updateSurvey: null,
            selectedLang: null,
            selectedScreenId: null,
            setSelectedScreenId: null,
            setSelectedFormElementId: null,
            selectedFormElementId: null,
            screenNumber: null,
            setScreenNumber: null,
          }}
        >
          <SurveyContext.Provider
            value={{
              encryptionpassword: "",
              selectedTeamId,
              surveyTeamMapId,
              selectedTeamName,
              filterTeams,
              setFilterTeams,
              filterTags: null,
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
              flowDbId={flow.dbFlowId}
            />
            <Tabs
              value={tab}
              onValueChange={(value) => setTab(value as FlowTabEnum)}
              className={styles["flow-page-panels-container"]}
            >
              <TabsContent value={FlowTabEnum.Edit} className="h-full mt-0">
                <EditFlow
                  previewOpened={previewOpened}
                  setPreviewOpened={setPreviewOpened}
                />
              </TabsContent>
              <TabsContent
                value={FlowTabEnum.Settings}
                className="h-full overflow-y-auto mt-0"
              >
                <FlowSettings
                  flowName={flow.name}
                  flowDbId={flow.dbFlowId}
                  anonymous={flow?.anonymous}
                  survey={survey}
                  surveyId={survey.id}
                />
              </TabsContent>
              <TabsContent
                value={FlowTabEnum.Responses}
                className="mt-0 relative h-full"
              >
                <Result
                  encryptionpassword={""}
                  setEncryptionPassword={() => {}}
                  survey={survey}
                  flowId={flow.flowId}
                  translations={translations}
                  version={flow.version}
                  flow={flow}
                />
              </TabsContent>
              <TabsContent
                value={FlowTabEnum.Share}
                className="h-full overflow-y-auto mt-0"
              >
                <FlowShare
                  flowName={flow.name}
                  flowDbId={flow.dbFlowId}
                  survey={survey}
                  surveyId={survey.id}
                />
              </TabsContent>
              <TabsContent
                value={FlowTabEnum.Analytics}
                className="h-full overflow-y-auto mt-0"
              >
                <ResultsOverviewWebForm
                  surveyId={survey?.id}
                  aiResponseSummary={(survey as any)?.aiResponseSummary}
                  survey={survey}
                  flowId={flow?.flowId}
                  version={flow?.version}
                  flowQuestions={flowQuestions}
                  questions={[]}
                />
              </TabsContent>
              <TabsContent
                value={FlowTabEnum.TeamAnalytics}
                className="h-full overflow-y-auto mt-0"
              >
                <ResultComparison
                  surveyId={survey.id}
                  version={flow.version}
                  flowQuestions={flowQuestions}
                  questions={flowQuestions}
                />
              </TabsContent>
            </Tabs>
          </SurveyContext.Provider>
        </EditFlowContext.Provider>
      </div>
    </div>
  );
};

export default Flow;
