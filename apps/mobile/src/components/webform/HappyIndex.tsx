import { AngryIcon, FrownIcon, LaughIcon, MehIcon, SmileIcon } from "lucide-react-native";
import React from "react";
import { Text, View } from "react-native";
import { AnimatedCircularProgress } from "react-native-circular-progress";

import { useHappyIndex } from "@/api/response/response.query";
import ProgressBar from "@/components/common/ProgressBar";
import { FONT, NUM, useTheme } from "@/components/loyalty/cashier/ui";
import { CardSkeleton, DotBadge, SectionCard } from "@/components/surveyResults/kit";
import { getSentiment, scale5 } from "@/constants/sentimentScale";

const HappyIndex = ({ surveyId }: { surveyId: string }) => {
  const { t, isDark } = useTheme();
  const s = getSentiment(isDark);
  const colors = scale5(s);
  const { data, isLoading } = useHappyIndex(surveyId);

  if (isLoading || !data) return <CardSkeleton height={420} />;

  const happiness = Number(data.happinessIndex ?? 0);
  const outOfTen = Number((happiness / 10).toFixed(1));

  // Worst first, mirroring the web's `INDEX_BANDS`.
  const bands = [
    { min: 9, label: "Very Happy", color: s.best },
    { min: 7, label: "Happy", color: s.good },
    { min: 5, label: "Neutral", color: s.neutral },
    { min: 3, label: "Unhappy", color: s.poor },
    { min: -Infinity, label: "Very Unhappy", color: s.worst },
  ];
  const band = bands.find((b) => outOfTen >= b.min) ?? bands[bands.length - 1];

  const moods = [
    {
      label: "Very Happy",
      value: data.veryHappy,
      pct: data.veryHappyPercentage,
      Icon: LaughIcon,
      color: colors[4],
    },
    {
      label: "Happy",
      value: data.happy,
      pct: data.happyPercentage,
      Icon: SmileIcon,
      color: colors[3],
    },
    {
      label: "Neutral",
      value: data.neutral,
      pct: data.neutralPercentage,
      Icon: MehIcon,
      color: colors[2],
    },
    {
      label: "Unhappy",
      value: data.sad,
      pct: data.sadPercentage,
      Icon: FrownIcon,
      color: colors[1],
    },
    {
      label: "Very Unhappy",
      value: data.verySad,
      pct: data.verySadPercentage,
      Icon: AngryIcon,
      color: colors[0],
    },
  ];

  return (
    <SectionCard
      title="Happiness Index"
      description="How respondents felt, from their scale answers."
    >
      <View style={{ alignItems: "center" }}>
        <AnimatedCircularProgress
          size={180}
          width={16}
          fill={happiness}
          tintColor={band.color}
          backgroundColor={t.surface2}
          rotation={0}
          lineCap="round"
        >
          {() => (
            <View style={{ alignItems: "center", gap: 6 }}>
              <View style={{ alignItems: "center" }}>
                <Text style={{ fontFamily: FONT.extrabold, fontSize: 36, color: t.fg1, ...NUM }}>
                  {outOfTen.toFixed(1)}
                </Text>
                <Text style={{ fontFamily: FONT.regular, fontSize: 12, color: t.fg3 }}>
                  Out of 10
                </Text>
              </View>
              <DotBadge label={band.label} color={band.color} />
            </View>
          )}
        </AnimatedCircularProgress>
      </View>

      <View style={{ gap: 14 }}>
        {moods.map(({ label, value, pct, Icon, color }) => (
          <View key={label} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: t.brandSoft,
              }}
            >
              <Icon size={20} color={t.brand} />
            </View>
            <View style={{ flex: 1, gap: 6 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontFamily: FONT.medium, fontSize: 12, color: t.fg1 }}>{label}</Text>
                <Text style={{ fontFamily: FONT.regular, fontSize: 12, color: t.fg3, ...NUM }}>
                  {value ?? 0}
                  <Text style={{ fontFamily: FONT.medium, color: t.fg1 }}>
                    {"  "}
                    {Math.round(pct ?? 0)}%
                  </Text>
                </Text>
              </View>
              <ProgressBar
                progress={(pct ?? 0) / 100}
                color={color}
                style={{ height: 6, borderRadius: 10, backgroundColor: t.surface2 }}
              />
            </View>
          </View>
        ))}
      </View>
    </SectionCard>
  );
};

export default HappyIndex;
