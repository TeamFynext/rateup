import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";

import { Box, MantineProvider, Stack, Tabs } from "@mantine/core";
import { useTranslations } from "next-intl";

import { SubscriptionFeaturePathName } from "@/types/enums";
import { whatsappTheme } from "@/config/mantineTheme";
import { useSubscription } from "@/backend/subscription/subscription.query";
import { useSurvey } from "@/backend/surveys/surveys.query";
import { useWaFlowFromDb } from "@/backend/whatsapp/flow/flow.query";
import RateupLoader from "@/components/Loaders/RateupLoader";
import StyledTabs from "@/components/styled/StyledTabs/StyledTabs";
import Result from "@/components/Survey/Result/Result";
import SurveySettings from "@/components/Survey/Settings";
import { ShareFlow } from "@/components/Survey/ShareSurvey/ShareFlow";
import EditFlow from "@/components/whatsapp/flow-v2/EditFlow";
import { EditFlowContext } from "@/components/whatsapp/flows/FlowPage/EditFlow/EditFlowContext";
import FlowPageHeader, {
  FlowTabEnum,
} from "@/components/whatsapp/flows/FlowPage/FlowPageHeader";
import { useRouteParams } from "@/context/RouteParamsContext";
import SurveyContext from "@/context/SurveyContext";
import { hasFeature } from "@/utils/subscription/subscription";

import styles from "./FlowPage.module.css";

const Flow = () => {
  const [tab, setTab] = useState(FlowTabEnum.Edit);

  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [selectedTeamName, setSelectedTeamName] = useState("");
  const [surveyTeamMapId, setSurveyTeamMapId] = useState("");
  const [teamOptions, setTeamOptions] = useState([]);
  const [filterTeams, setFilterTeams] = useState([]);

  const router = useRouter();
  const { dbFlowId } = router.query as { dbFlowId: string };
  const { data: flow, isPending } = useWaFlowFromDb(dbFlowId);
  const { data: survey, isPending: isSurveyPending } = useSurvey(
    flow?.surveyId,
  );
  const { data: subscription } = useSubscription();
  const { tab: tabView } = router.query;

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
    <MantineProvider theme={whatsappTheme}>
      <Box className={styles["flow-page-container"]}>
        <Stack className={styles["flow-page-content"]}>
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
              <FlowPageHeader name={flow.name} tab={tab} setTabState={setTab} />
              <StyledTabs
                className={styles["flow-page-panels-container"]}
                keepMounted={false}
                value={tab}
                h={"100%"}
              >
                <Tabs.Panel value={FlowTabEnum.Edit} h={"100%"}>
                  <EditFlow />
                </Tabs.Panel>
                <Tabs.Panel value={FlowTabEnum.Settings}>
                  <SurveySettings
                    surveyId={survey.id}
                    survey={survey}
                    enabledModules={[
                      "teams",
                      "flow",
                      hasFeature(
                        subscription,
                        SubscriptionFeaturePathName.Ticket,
                      ) && "tickets",
                    ]}
                    flowName={flow.name}
                    flowDbId={flow.dbFlowId}
                    anonymous={flow?.anonymous}
                  />
                </Tabs.Panel>
                <Tabs.Panel value={FlowTabEnum.Result}>
                  <Result
                    encryptionpassword={""}
                    setEncryptionPassword={() => {}}
                    survey={survey}
                    flowId={flow.flowId}
                    translations={translations}
                    version={flow.version}
                    flow={flow}
                  />
                </Tabs.Panel>
                <Tabs.Panel value={FlowTabEnum.Share}>
                  <ShareFlow allowUnpublishedShare={true} />
                </Tabs.Panel>
              </StyledTabs>
            </SurveyContext.Provider>
          </EditFlowContext.Provider>
        </Stack>
      </Box>
    </MantineProvider>
  );
};

export default Flow;
