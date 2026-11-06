import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import { View } from "react-native";

import { useWaFlowFromDb } from "@/api/whatsapp/flow/flow.query";
import ScreenHeader from "@/components/common/ScreenHeader";
import { CenteredSpinner, EmptyState, useTheme } from "@/components/loyalty/cashier/ui";
import SurveyResultsScreen from "@/components/surveyResults/SurveyResultsScreen";
import { useFlowDataStore, useFlowResponseDataStore } from "@/utils/store";
import { firstParam } from "@/utils/params";

const FlowPage = () => {
  const { t } = useTheme();
  const params = useLocalSearchParams<{ flowId: string; flowName?: string }>();
  const flowId = firstParam(params.flowId);
  const flowName = firstParam(params.flowName);
  const { data: flow, isLoading } = useWaFlowFromDb(flowId);
  const { setData } = useFlowResponseDataStore();
  const { setFlowData } = useFlowDataStore();

  if (!flow) {
    return (
      <View style={{ flex: 1, backgroundColor: t.pageBg }}>
        <ScreenHeader title={flowName || "Flow"} onBack={() => router.back()} />
        {isLoading ? (
          <CenteredSpinner />
        ) : (
          <View style={{ padding: 16 }}>
            <EmptyState
              title="Could not load this flow"
              body="Check your internet connection and try again."
            />
          </View>
        )}
      </View>
    );
  }

  return (
    <SurveyResultsScreen
      title={flowName || flow.name}
      surveyId={flow.surveyId}
      version={flow.version}
      flow={flow}
      onOpenResponse={(item) => {
        setData([item]);
        setFlowData([flow]);
        router.push({
          pathname:
            flow.version === 1
              ? "/protected/flow/flowresponse/[flowresponseId]"
              : "/protected/flow/flow2/[flowresponseId]",
          params: { flowresponseId: item.id, surveyId: flow.surveyId, respondent: item.phone },
        });
      }}
    />
  );
};

export default FlowPage;
