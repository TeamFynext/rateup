import { useTranslation } from "react-i18next";
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";

import { NPS_COLORS } from "@/components/common/sentimentScale.ts";
import { StatTile } from "@/components/common/StatTile.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart.tsx";
import type { FlowQuestionSummary } from "@/components/whatsapp/flow-v2/utils/store.ts";
import { getResponseArrayByQuestionType } from "@/utils/response.ts";

import { getReplacedTitleFromVariable } from "../TakeSurvey/TakeSurveyComponent/util.tsx";
import SurveyResultByType from "./SurveySummaryNewWebForm.tsx";

/** One aggregated choice bucket for a question. */
interface ChoiceWiseDatum {
  choice: string | number;
  count: number;
}

/** Aggregated answers for a single question. */
interface ChoiceWiseEntry {
  responseCount?: number;
  data: ChoiceWiseDatum[];
}

/** NPS breakdown for a single question. */
interface NpsEntry {
  npsData?: {
    npsScore?: number;
    promoters?: number;
    passives?: number;
    detractors?: number;
  };
}

interface SurveyQuestionProps {
  /** `Object.entries` of the analytics response, so one `[questionId, data]` pair per question. */
  choiceWise: Array<[string, ChoiceWiseEntry]>;
  NPS: Array<[string, NpsEntry]>;
  version?: number;
  flowQuestions?: FlowQuestionSummary[];
  questions?: Question[];
  surveyId: string;
  defaultLanguage: string;
}

const SurveyQuestion = ({
  choiceWise,
  NPS,
  version,
  flowQuestions,
  questions,
  surveyId,
  defaultLanguage,
}: SurveyQuestionProps) => {
  const { t } = useTranslation();
  if (choiceWise.length === 0) return null;

  function getQuestion(questionId: string) {
    if (version === 1) {
      const question = questions?.find((q) => q.id === questionId);
      return {
        type: question?.type,
        questionTitle: question?.title || question?.label,
        dataSource: undefined,
      };
    }
    const question = flowQuestions?.find((q) => q.id === questionId);
    return {
      type: question?.metaType,
      questionTitle: question?.header || question?.label,
      dataSource: question?.dataSource,
    };
  }

  const getPercentage = (count: number, total: number) =>
    total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("Question breakdown")}</CardTitle>
        <CardDescription>{t("How each answer was distributed.")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col divide-y divide-border">
        {choiceWise.map(([questionId, questionData], index) => {
          const questionDetails = getQuestion(questionId);
          const npsEntry = NPS.find(([id]) => id === questionId)?.[1];
          const responseCount = questionData?.responseCount || 0;
          const npsScore = Math.round(npsEntry?.npsData?.npsScore ?? 0);
          const promoters = npsEntry?.npsData?.promoters ?? 0;
          const passives = npsEntry?.npsData?.passives ?? 0;
          const detractors = npsEntry?.npsData?.detractors ?? 0;
          const total = promoters + passives + detractors;
          const happinessIndex = total > 0 ? ((promoters / total) * 10).toFixed(1) : "0";

          const scale = getResponseArrayByQuestionType(questionDetails.type);
          // A v2 flow reports a choice by its title; its data-source id is the scale value.
          const scaleValueOf = (choice: string | number) =>
            questionDetails.dataSource?.find((d) => d.title === String(choice))?.id ??
            String(choice);
          const chartData = questionData?.data.map((item) => ({
            ...item,
            percentage: getPercentage(item.count, responseCount),
            fill:
              scale?.find((ch) => ch.value.toString() === scaleValueOf(item.choice))?.color ??
              "var(--chart-2)",
          }));

          const title =
            typeof questionDetails.questionTitle === "object"
              ? getReplacedTitleFromVariable({
                  title: questionDetails.questionTitle[defaultLanguage],
                  surveyId,
                })
              : questionDetails.questionTitle;

          const npsParts = [
            { label: t("Promoters"), value: promoters, color: NPS_COLORS.promoter },
            { label: t("Passives"), value: passives, color: NPS_COLORS.passive },
            { label: t("Detractors"), value: detractors, color: NPS_COLORS.detractor },
          ];

          return (
            <section key={questionId} className="flex flex-col gap-6 py-8 first:pt-0 last:pb-0">
              <div className="flex items-start gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary tabular-nums">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-foreground">{title}</h3>
                  <p className="text-xs text-muted-foreground">
                    {t("{count, plural, one {# response} other {# responses}}", {
                      count: responseCount,
                    })}
                  </p>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:items-start">
                <SurveyResultByType
                  questionType={questionDetails.type}
                  chartData={chartData}
                  version={version}
                />

                <div className="flex min-w-0 flex-col gap-4">
                  <ChartContainer config={chartConfig} className="h-64 w-full">
                    <BarChart data={chartData} margin={{ top: 8, left: 4, right: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="choice" tickLine={false} axisLine={false} tickMargin={8} />
                      <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={32} />
                      <ChartTooltip
                        cursor={false}
                        content={
                          <ChartTooltipContent
                            hideIndicator
                            formatter={(_value, _name, item) => {
                              const datum = item.payload as { count: number; percentage: number };
                              return (
                                <span className="tabular-nums">
                                  {t("{count, plural, one {# vote} other {# votes}}", {
                                    count: datum.count,
                                  })}{" "}
                                  ({datum.percentage}%)
                                </span>
                              );
                            }}
                          />
                        }
                      />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={48}>
                        {chartData?.map((d) => (
                          <Cell key={String(d.choice)} fill={d.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ChartContainer>

                  {npsEntry?.npsData && (
                    <div className="flex flex-col gap-4">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <StatTile label={t("Responses")} value={responseCount.toLocaleString()} />
                        <StatTile
                          label={t("NPS")}
                          value={npsScore >= 0 ? `+${npsScore}` : String(npsScore)}
                        />
                        <StatTile label={t("Happiness Index")} value={happinessIndex} />
                      </div>

                      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
                        {npsParts.map((part) => (
                          <div
                            key={part.label}
                            style={{
                              width: `${getPercentage(part.value, responseCount)}%`,
                              backgroundColor: part.color,
                            }}
                          />
                        ))}
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        {npsParts.map((part) => (
                          <div key={part.label} className="flex flex-col gap-0.5">
                            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <span
                                className="size-2 rounded-[2px]"
                                style={{ backgroundColor: part.color }}
                                aria-hidden
                              />
                              {part.label}
                            </p>
                            <p className="text-xl font-semibold tabular-nums text-foreground">
                              {getPercentage(part.value, responseCount)}%
                            </p>
                            <p className="text-xs tabular-nums text-muted-foreground">
                              {t("{count, plural, one {# response} other {# responses}}", {
                                count: part.value,
                              })}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>
          );
        })}
      </CardContent>
    </Card>
  );
};

/** Bars take their colour per cell; the config only names the series for the tooltip. */
const chartConfig: ChartConfig = { count: { label: "Votes", color: "var(--chart-2)" } };

export default SurveyQuestion;
