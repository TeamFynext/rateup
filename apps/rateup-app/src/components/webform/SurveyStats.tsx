import { MessageSquareText, Percent, Play, Users } from "lucide-react-native";
import React, { useMemo } from "react";
import { View } from "react-native";

import { useResponseCount } from "@/api/response/response.query";
import { useGetSurveyStats } from "@/api/survey/survey.query";
import { useTheme } from "@/components/loyalty/cashier/ui";
import { StatTile } from "@/components/surveyResults/kit";

const SurveyStatsWebForm = ({ surveyId }: { surveyId: string }) => {
  const { t } = useTheme();
  const { data: responseCountData } = useResponseCount(surveyId);
  const { data: surveyStats } = useGetSurveyStats(surveyId);

  const responseCount: number = responseCountData?.all ?? 0;
  const { visited, started } = useMemo(
    () =>
      (surveyStats ?? []).reduce(
        (acc: { visited: number; started: number }, curr: any) => {
          acc.visited += curr?.visited ?? 0;
          acc.started += curr?.started ?? 0;
          return acc;
        },
        { visited: 0, started: 0 },
      ),
    [surveyStats],
  );

  // More responses than visits means the visit counter missed some; a rate would be nonsense.
  const rate =
    responseCount > visited
      ? "—"
      : `${visited > 0 ? Number(((responseCount / visited) * 100).toFixed(1)) : 0}%`;

  const icon = (Icon: typeof Users) => <Icon size={14} color={t.fg4} />;

  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
      <StatTile
        label="Total responses"
        value={responseCount.toLocaleString()}
        icon={icon(MessageSquareText)}
      />
      <StatTile label="Started" value={started.toLocaleString()} icon={icon(Play)} />
      <StatTile label="Total visits" value={visited.toLocaleString()} icon={icon(Users)} />
      <StatTile label="Response rate" value={rate} icon={icon(Percent)} />
    </View>
  );
};

export default SurveyStatsWebForm;
