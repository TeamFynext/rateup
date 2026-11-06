import { SmileIcon, StarIcon, TargetIcon, UsersIcon } from "lucide-react-native";
import React, { useState } from "react";
import { Dimensions, Text, View } from "react-native";
import { BarChart } from "react-native-gifted-charts";

import { useAllResponseNPSForGraph } from "@/api/response/response.query";
import SegmentedControl from "@/components/common/SegmentedControl";
import { FONT, NUM, useTheme } from "@/components/loyalty/cashier/ui";
import { CardSkeleton, SectionCard, Swatch } from "@/components/surveyResults/kit";
import { getSentiment, npsColors } from "@/constants/sentimentScale";

const PERIODS = [
  { value: "hourly", label: "Hourly" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
] as const;

type Period = (typeof PERIODS)[number]["value"];

type GraphPoint = {
  date: string;
  total: number;
  promoters: number;
  passives: number;
  detractors: number;
  happinessIndex: number;
  npsScore: number;
  avgNPSRating: number;
};

/** Page gutter, card padding and both y-axis label columns. */
const CHART_CHROME = 32 + 32 + 2 * 34;

const num = (n: unknown) => (typeof n === "number" ? n : Number(n) || 0);

const HappinessJourney = ({ surveyId }: { surveyId: string }) => {
  const { t, isDark } = useTheme();
  const colors = npsColors(getSentiment(isDark));
  const [period, setPeriod] = useState<Period>("daily");
  const [selected, setSelected] = useState<number | null>(null);
  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const { data = [], isLoading } = useAllResponseNPSForGraph(period, userTimeZone, surveyId);

  const points = data as GraphPoint[];
  // Until a bar is tapped, the summary reads the latest period that had answers.
  const latest = points.reduce((last, p, i) => (num(p.total) > 0 ? i : last), -1);
  const focusIndex = selected ?? latest;
  const point = focusIndex >= 0 ? points[focusIndex] : undefined;

  const axisText = { fontFamily: FONT.regular, fontSize: 10, color: t.fg3 };
  const stackData = points.map((p, index) => ({
    label: p.date,
    onPress: () => setSelected(index),
    stacks: [
      { value: num(p.detractors), color: colors.detractor },
      { value: num(p.passives), color: colors.passive },
      {
        value: num(p.promoters),
        color: colors.promoter,
        borderTopLeftRadius: 3,
        borderTopRightRadius: 3,
      },
    ],
  }));
  const lineData = points.map((p) => ({ value: num(p.happinessIndex) }));

  const metrics = [
    {
      label: "NPS score",
      Icon: TargetIcon,
      value: point ? `${num(point.npsScore) > 0 ? "+" : ""}${num(point.npsScore).toFixed(1)}` : "—",
    },
    {
      label: "Average NPS rating",
      Icon: StarIcon,
      value: point ? num(point.avgNPSRating).toFixed(1) : "—",
    },
    {
      label: "Happiness index",
      Icon: SmileIcon,
      value: point ? num(point.happinessIndex).toFixed(1) : "—",
    },
    { label: "Total responses", Icon: UsersIcon, value: point ? String(num(point.total)) : "—" },
  ];
  const breakdown = [
    { label: "Promoters", color: colors.promoter, value: point?.promoters },
    { label: "Passives", color: colors.passive, value: point?.passives },
    { label: "Detractors", color: colors.detractor, value: point?.detractors },
  ];

  return (
    <SectionCard title="Happiness Journey" description="Answers per period, split by NPS group.">
      <SegmentedControl
        options={PERIODS}
        value={period}
        inset={0}
        onChange={(p) => {
          setPeriod(p);
          setSelected(null);
        }}
      />

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        <Swatch color={colors.promoter} label="Promoters" />
        <Swatch color={colors.passive} label="Passives" />
        <Swatch color={colors.detractor} label="Detractors" />
        <Swatch color={t.fg1} label="Happiness index" />
      </View>

      {isLoading ? (
        <CardSkeleton height={240} />
      ) : (
        <BarChart
          stackData={stackData}
          height={200}
          width={Dimensions.get("window").width - CHART_CHROME}
          barWidth={14}
          spacing={22}
          initialSpacing={10}
          noOfSections={4}
          yAxisThickness={0}
          xAxisThickness={1}
          xAxisColor={t.border1}
          rulesType="solid"
          rulesColor={t.rowDivider}
          yAxisTextStyle={axisText}
          xAxisLabelTextStyle={axisText}
          labelWidth={44}
          scrollToIndex={latest >= 0 ? latest : undefined}
          showLine
          lineData={lineData}
          lineConfig={{
            isSecondary: true,
            color: t.fg1,
            thickness: 2,
            curved: true,
            dataPointsColor: t.fg1,
            dataPointsRadius: 3,
            initialSpacing: 17,
          }}
          secondaryYAxis={{
            maxValue: 10,
            noOfSections: 4,
            yAxisThickness: 0,
            yAxisTextStyle: axisText,
          }}
        />
      )}

      <View style={{ gap: 4 }}>
        <Text style={{ fontFamily: FONT.medium, fontSize: 12, color: t.fg3 }}>
          {point ? point.date : "No answers in this range"}
        </Text>
        <View style={{ borderRadius: 12, borderWidth: 1, borderColor: t.border1 }}>
          {metrics.map(({ label, Icon, value }, i) => (
            <View
              key={label}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderTopWidth: i ? 1 : 0,
                borderTopColor: t.rowDivider,
              }}
            >
              <Icon size={16} color={t.fg3} />
              <Text style={{ flex: 1, fontFamily: FONT.regular, fontSize: 13, color: t.fg2 }}>
                {label}
              </Text>
              <Text style={{ fontFamily: FONT.semibold, fontSize: 14, color: t.fg1, ...NUM }}>
                {value}
              </Text>
            </View>
          ))}
        </View>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
          {breakdown.map(({ label, color, value }) => (
            <View key={label} style={{ flex: 1, gap: 2 }}>
              <Swatch color={color} label={label} />
              <Text style={{ fontFamily: FONT.semibold, fontSize: 18, color: t.fg1, ...NUM }}>
                {point ? num(value) : "—"}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </SectionCard>
  );
};

export default HappinessJourney;
