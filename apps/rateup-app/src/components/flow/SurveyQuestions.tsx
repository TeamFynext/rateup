import React, { useMemo } from "react";
import { Text, View } from "react-native";

import type { SurveyQuestion } from "@/api/question/types";
import type { ChoiceWiseEntry, NpsEntry } from "@/api/response/types";
import type { DbFlow } from "@/api/whatsapp/types";
import ProgressBar from "@/components/common/ProgressBar";
import { Divider, FONT, NUM, useTheme } from "@/components/loyalty/cashier/ui";
import { SectionCard, StatTile, Swatch, plural } from "@/components/surveyResults/kit";
import { scaleColor } from "@/components/surveyResults/scaleColor";
import { getSentiment, npsColors } from "@/constants/sentimentScale";
import { QuestionType2 } from "./enum";

type SurveyQuestionProps = {
  /** `Object.entries` of the analytics `choiceWise` map, keyed by question id. */
  choiceWise: [string, ChoiceWiseEntry][];
  /** `Object.entries` of the analytics `nps` map, keyed by question id. */
  NPS: [string, NpsEntry][];
  version?: number;
  questions?: SurveyQuestion[];
  /** null on web forms, which have no backing flow. */
  flow: DbFlow | null;
};

const getPercentage = (count: number, total: number) =>
  total > 0 ? Math.round((count / total) * 100) : 0;

const SurveyQuestions = ({ choiceWise, NPS, flow, version, questions }: SurveyQuestionProps) => {
  const { t, isDark } = useTheme();
  const s = getSentiment(isDark);
  const nps = npsColors(s);

  const flowQuestions = useMemo(
    () =>
      flow?.json?.screens?.flatMap((screen) =>
        screen.layout.children
          .filter((child) => child.type !== QuestionType2.Footer && child.name)
          .map((child) => ({
            id: child.id,
            label: child.label,
            metaType: child.metaType,
            header: child.header,
            dataSource: child["data-source"],
          })),
      ),
    [flow],
  );

  const getQuestion = (questionId: string) => {
    if (version === 1) {
      const question = questions?.find((q) => q?.id === questionId);
      return {
        type: question?.type,
        title: question?.title || question?.label,
        dataSource: undefined,
      };
    }
    const question = flowQuestions?.find((q) => q.id === questionId);
    return {
      type: question?.metaType,
      title: question?.header || question?.label,
      dataSource: question?.dataSource,
    };
  };

  if (choiceWise.length === 0) return null;

  return (
    <SectionCard title="Question breakdown" description="How each answer was distributed.">
      {choiceWise.map(([questionId, questionData], index) => {
        const { type, title, dataSource } = getQuestion(questionId);
        const responseCount = questionData?.responseCount || 0;
        const npsData = NPS.find(([id]) => id === questionId)?.[1]?.npsData;
        const maxCount = Math.max(0, ...questionData.data.map((c) => c.count));

        const scaleValueOf = (choice: string | number) =>
          dataSource?.find((d) => d.title === String(choice))?.id ?? String(choice);

        return (
          <View key={questionId} style={{ gap: 14 }}>
            {index > 0 ? <Divider /> : null}

            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: t.brandSoft,
                }}
              >
                <Text style={{ fontFamily: FONT.semibold, fontSize: 12, color: t.brand, ...NUM }}>
                  {index + 1}
                </Text>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontFamily: FONT.semibold, fontSize: 14, color: t.fg1 }}>
                  {getLocalizedText(title)}
                </Text>
                <Text style={{ fontFamily: FONT.regular, fontSize: 12, color: t.fg3 }}>
                  {plural(responseCount, "response")}
                </Text>
              </View>
            </View>

            {questionData.data.length === 0 ? (
              <Text style={{ fontFamily: FONT.regular, fontSize: 13, color: t.fg3 }}>
                No responses yet.
              </Text>
            ) : (
              <View style={{ gap: 12 }}>
                {questionData.data.map((item) => {
                  const pct = getPercentage(item.count, responseCount);
                  const top = item.count === maxCount && maxCount > 0;
                  return (
                    <View key={String(item.choice)} style={{ gap: 6 }}>
                      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
                        <Text
                          numberOfLines={2}
                          style={{
                            flex: 1,
                            fontFamily: top ? FONT.semibold : FONT.regular,
                            fontSize: 13,
                            color: t.fg1,
                          }}
                        >
                          {String(item.choice)}
                        </Text>
                        <Text
                          style={{ fontFamily: FONT.regular, fontSize: 12, color: t.fg3, ...NUM }}
                        >
                          {plural(item.count, "vote")}
                          <Text style={{ fontFamily: FONT.medium, color: t.fg1 }}>
                            {"  "}
                            {pct}%
                          </Text>
                        </Text>
                      </View>
                      <ProgressBar
                        progress={pct / 100}
                        color={scaleColor(type, scaleValueOf(item.choice), s) ?? t.brand}
                        style={{ height: 8, borderRadius: 4, backgroundColor: t.surface2 }}
                      />
                    </View>
                  );
                })}
              </View>
            )}

            {npsData ? (
              <NpsBlock
                responseCount={responseCount}
                npsScore={Math.round(npsData.npsScore ?? 0)}
                parts={[
                  { label: "Promoters", value: npsData.promoters ?? 0, color: nps.promoter },
                  { label: "Passives", value: npsData.passives ?? 0, color: nps.passive },
                  { label: "Detractors", value: npsData.detractors ?? 0, color: nps.detractor },
                ]}
              />
            ) : null}
          </View>
        );
      })}
    </SectionCard>
  );
};

export default SurveyQuestions;

function NpsBlock({
  responseCount,
  npsScore,
  parts,
}: Readonly<{
  responseCount: number;
  npsScore: number;
  parts: { label: string; value: number; color: string }[];
}>) {
  const { t } = useTheme();
  const total = parts.reduce((sum, p) => sum + p.value, 0);
  const happiness = total > 0 ? ((parts[0].value / total) * 10).toFixed(1) : "0";

  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <StatTile label="Responses" minWidth="30%" value={responseCount.toLocaleString()} />
        <StatTile
          label="NPS"
          minWidth="30%"
          value={npsScore >= 0 ? `+${npsScore}` : String(npsScore)}
        />
        <StatTile label="Happiness index" minWidth="30%" value={happiness} />
      </View>

      <View
        style={{
          flexDirection: "row",
          height: 10,
          borderRadius: 5,
          overflow: "hidden",
          backgroundColor: t.surface2,
        }}
      >
        {parts.map((p) => (
          <View
            key={p.label}
            style={{ width: `${getPercentage(p.value, responseCount)}%`, backgroundColor: p.color }}
          />
        ))}
      </View>

      <View style={{ flexDirection: "row", gap: 8 }}>
        {parts.map((p) => (
          <View key={p.label} style={{ flex: 1, gap: 2 }}>
            <Swatch color={p.color} label={p.label} />
            <Text style={{ fontFamily: FONT.semibold, fontSize: 18, color: t.fg1, ...NUM }}>
              {getPercentage(p.value, responseCount)}%
            </Text>
            <Text style={{ fontFamily: FONT.regular, fontSize: 12, color: t.fg3, ...NUM }}>
              {plural(p.value, "response")}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getLocalizedText = (input: unknown): string => {
  const rawText: unknown =
    typeof input === "string" ? input : isRecord(input) ? input.en || Object.values(input)[0] : "";

  return typeof rawText === "string" ? rawText.replace(/<[^>]+>/g, "").trim() : "";
};
