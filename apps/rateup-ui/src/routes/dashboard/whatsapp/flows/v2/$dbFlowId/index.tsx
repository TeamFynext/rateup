import { createFileRoute, useParams, useSearch } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";

import { useSurvey } from "@/backend/surveys/surveys.query";
import { useWaFlowFromDb } from "@/backend/whatsapp/flow/flow.query";
import RateupLoader from "@/components/Loaders/RateupLoader.tsx";
import Result from "@/components/Survey/Result/Result.tsx";
import ResultComparison from "@/components/Survey/Result/ResultComparison.tsx";
import { Tabs, TabsContent } from "@/components/ui/tabs.tsx";
import EditFlow from "@/components/whatsapp/flow-v2/EditFlow.tsx";
import { FlowScreenSheet } from "@/components/whatsapp/flow-v2/Preview/WhatsAppPreview.tsx";
import type { IEditFlowContext } from "@/components/whatsapp/flows/FlowPage/EditFlow/EditFlowContext.ts";
import { EditFlowContext } from "@/components/whatsapp/flows/FlowPage/EditFlow/EditFlowContext.ts";
import FlowPageHeader, {
  FlowTabEnum,
} from "@/components/whatsapp/flows/FlowPage/FlowPageHeader/index.tsx";
import FlowSettings from "@/components/whatsapp/flows/FlowSettings/index.tsx";
import FlowShare from "@/components/whatsapp/flows/FlowShare/index.tsx";
import { useRouteParams } from "@/context/RouteParamsContext.tsx";
import SurveyContext from "@/context/SurveyContext.ts";

import styles from "../../../../../../components/dashboard/whatsapp/flows/v2/FlowPage.module.css";

export const Route = createFileRoute("/dashboard/whatsapp/flows/v2/$dbFlowId/")({
  component: Flow,
});

const ResultsOverviewWebForm = lazy(
  () => import("@/components/Survey/Result/ResultsOverviewWebForm.tsx"),
);

function Flow() {
  const [tab, setTab] = useState(FlowTabEnum.Edit);

  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [selectedTeamName, setSelectedTeamName] = useState("");
  const [surveyTeamMapId, setSurveyTeamMapId] = useState("");
  const [teamOptions, setTeamOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [filterTeams, setFilterTeams] = useState<string[]>([]);

  const params = useParams({
    strict: false,
  });
  const dbFlowId = params.dbFlowId as string;
  const searchParams = useSearch({ strict: false });
  const tabView = searchParams.tab as string;

  const { data: flow, isPending } = useWaFlowFromDb(dbFlowId);
  const { data: survey, isPending: isSurveyPending } = useSurvey(flow?.surveyId ?? "");

  const flowQuestions = useMemo(() => {
    if (!flow?.json?.screens) return [];
    return flow.json.screens.flatMap((screen: any) =>
      screen.layout.children
        .filter((child: any) => child.type !== "Footer")
        .map(({ id, label, metaType, name, "data-source": dataSource, header }: any) => ({
          id,
          label,
          metaType,
          dataSource,
          name,
          header,
        }))
        .filter(({ name }: any) => name),
    );
  }, [flow]);

  const { update } = useRouteParams();

  useEffect(() => {
    update({ dbFlowId: flow?.name });
  }, [flow, update]);

  useEffect(() => {
    if (selectedTeamId) {
      setSurveyTeamMapId(survey?.teams?.find((team) => team.id === selectedTeamId)?.mapId ?? "");
      setSelectedTeamName(survey?.teams?.find((team) => team.id === selectedTeamId)?.name ?? "");
    }
  }, [selectedTeamId]);

  useEffect(() => {
    if (teamOptions) setSelectedTeamId(teamOptions?.[0]?.value ?? "");
  }, [teamOptions]);

  useEffect(() => {
    if (survey) {
      const options = survey?.teams?.map((team) => ({
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

  if (isPending || isSurveyPending || !flow || !survey) return <RateupLoader />;

  return (
    <div className={styles["flow-page-container"]}>
      <div className={styles["flow-page-content"]}>
        <EditFlowContext.Provider
          // Only the Result and Share tabs render below, so the flow-editor
          // fields of the context are deliberately left unset.
          value={{ survey } as IEditFlowContext}
        >
          <SurveyContext.Provider
            value={{
              encryptionpassword: "",
              selectedTeamId,
              surveyTeamMapId,
              selectedTeamName,
              filterTeams,
              setFilterTeams,
              filterTags: [],
              surveyId: survey?.id,
              teams: teamOptions,
            }}
          >
            <FlowPageHeader
              name={flow.name}
              tab={tab}
              setTabState={setTab}
              flowDbId={flow.dbFlowId}
              phonePreview={<FlowScreenSheet />}
            />
            <Tabs
              value={tab}
              onValueChange={(value) => setTab(value as FlowTabEnum)}
              className={styles["flow-page-panels-container"]}
            >
              <TabsContent value={FlowTabEnum.Edit} className="h-full mt-0">
                <EditFlow />
              </TabsContent>
              <TabsContent value={FlowTabEnum.Settings} className="h-full overflow-y-auto mt-0">
                <FlowSettings
                  flowName={flow.name}
                  flowDbId={flow.dbFlowId}
                  anonymous={flow?.anonymous}
                  survey={survey}
                  surveyId={survey.id}
                />
              </TabsContent>
              <TabsContent value={FlowTabEnum.Responses} className="mt-0 relative h-full">
                <Result
                  encryptionpassword={""}
                  setEncryptionPassword={() => {}}
                  survey={survey}
                  version={flow.version}
                  flow={flow}
                />
              </TabsContent>
              <TabsContent value={FlowTabEnum.Share} className="h-full overflow-y-auto mt-0">
                <FlowShare
                  flowName={flow.name}
                  flowDbId={flow.dbFlowId}
                  survey={survey}
                  surveyId={survey.id}
                />
              </TabsContent>
              <TabsContent value={FlowTabEnum.Analytics} className="h-full overflow-y-auto mt-0">
                <Suspense
                  fallback={<div className="flex items-center justify-center h-64">Loading...</div>}
                >
                  <ResultsOverviewWebForm
                    surveyId={survey?.id}
                    aiResponseSummary={(survey as any)?.aiResponseSummary}
                    flowId={flow?.flowId}
                    version={flow?.version}
                    flowQuestions={flowQuestions}
                    questions={[]}
                  />
                </Suspense>
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
}
