import { router, useLocalSearchParams } from "expo-router";
import React from "react";

import SurveyResultsScreen from "@/components/surveyResults/SurveyResultsScreen";
import { useWebFormResponseDataStore } from "@/utils/store";
import { firstParam } from "@/utils/params";

const WebFormPage = () => {
  const params = useLocalSearchParams<{ webformId: string; webFormName?: string }>();
  const webformId = firstParam(params.webformId);
  const { setData } = useWebFormResponseDataStore();

  return (
    <SurveyResultsScreen
      title={firstParam(params.webFormName) || "Web form"}
      surveyId={webformId}
      version={1}
      flow={null}
      onOpenResponse={(item) => {
        setData([item]);
        router.push({
          pathname: "/protected/webform/webformresponse/[webformresponseId]",
          params: { webformresponseId: item.id, webformId, respondent: item.phone },
        });
      }}
    />
  );
};

export default WebFormPage;
