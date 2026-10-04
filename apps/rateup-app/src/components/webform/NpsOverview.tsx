import { AngryIcon, LaughIcon, MehIcon } from "lucide-react-native";
import React from "react";
import { Text, View } from "react-native";
import Svg, { Circle, G, Path, Text as SvgText } from "react-native-svg";

import { useHappyIndex } from "@/api/response/response.query";
import { FONT, NUM, useTheme } from "@/components/loyalty/cashier/ui";
import { CardSkeleton, DotBadge, SectionCard, plural } from "@/components/surveyResults/kit";
import { getSentiment, npsColors } from "@/constants/sentimentScale";

const NpsOverview = ({ surveyId }: { surveyId: string }) => {
  const { t, isDark } = useTheme();
  const s = getSentiment(isDark);
  const nps = npsColors(s);
  const { data, isLoading } = useHappyIndex(surveyId);

  if (isLoading || !data) return <CardSkeleton height={340} />;

  const parts = [
    {
      label: "Promoters",
      pct: data.promoterPercentage,
      value: data.promoters,
      color: nps.promoter,
      Icon: LaughIcon,
    },
    {
      label: "Passives",
      pct: data.passivePercentage,
      value: data.passives,
      color: nps.passive,
      Icon: MehIcon,
    },
    {
      label: "Detractors",
      pct: data.detractorPercentage,
      value: data.detractors,
      color: nps.detractor,
      Icon: AngryIcon,
    },
  ];

  return (
    <SectionCard title="NPS Overview" description="Promoters minus detractors, from −100 to +100.">
      <NpsGauge
        nps={data.nps}
        promoters={data.promoters}
        passives={data.passives}
        detractors={data.detractors}
      />
      <View style={{ flexDirection: "row", gap: 8 }}>
        {parts.map(({ label, pct, value, color, Icon }) => (
          <View key={label} style={{ flex: 1, alignItems: "center", gap: 3 }}>
            <Icon size={20} color={color} />
            <Text style={{ fontFamily: FONT.medium, fontSize: 12, color: t.fg3 }}>{label}</Text>
            <Text style={{ fontFamily: FONT.semibold, fontSize: 22, color: t.fg1, ...NUM }}>
              {pct ?? 0}%
            </Text>
            <Text style={{ fontFamily: FONT.regular, fontSize: 12, color: t.fg3, ...NUM }}>
              {plural(value ?? 0, "response")}
            </Text>
          </View>
        ))}
      </View>
    </SectionCard>
  );
};

export default NpsOverview;

const polarToCartesian = (cx: number, cy: number, r: number, angle: number) => {
  const rad = (angle - 90) * (Math.PI / 180);
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
};

const arcPath = (startAngle: number, sweepAngle: number, radius: number) => {
  const start = polarToCartesian(110, 110, radius, startAngle + sweepAngle);
  const end = polarToCartesian(110, 110, radius, startAngle);
  const largeArcFlag = sweepAngle > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
};

const finite = (n: unknown) => (typeof n === "number" && Number.isFinite(n) ? n : 0);

const NpsGauge = (props: {
  nps: number;
  promoters: number;
  passives: number;
  detractors: number;
}) => {
  const { t, isDark } = useTheme();
  const colors = npsColors(getSentiment(isDark));
  const s = getSentiment(isDark);

  const nps = finite(props.nps);
  const promoters = finite(props.promoters);
  const passives = finite(props.passives);
  const detractors = finite(props.detractors);
  // No NPS answers yet: draw an empty track rather than NaN arcs.
  const total = promoters + passives + detractors || 1;

  const segments = [
    { sweep: (detractors / total) * 180, color: colors.detractor },
    { sweep: (passives / total) * 180, color: colors.passive },
    { sweep: (promoters / total) * 180, color: colors.promoter },
  ];
  let start = -90;
  const rotation = ((nps + 100) / 200) * 180 - 90;

  const badge =
    nps >= 50
      ? { label: "Excellent", color: s.best }
      : nps >= 30
        ? { label: "Great", color: s.best }
        : nps >= 0
          ? { label: "Okay", color: s.poor }
          : { label: "Poor", color: s.worst };

  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={220} height={140} viewBox="0 0 220 160">
        <Path d="M 20 110 A 90 90 0 0 1 200 110" fill="none" stroke={t.surface2} strokeWidth={20} />
        {segments.map((seg, i) => {
          const d = arcPath(start, seg.sweep, 90);
          start += seg.sweep;
          return seg.sweep > 0 ? (
            <Path key={i} d={d} stroke={seg.color} strokeWidth={26} fill="none" />
          ) : null;
        })}
        <G rotation={rotation} origin="110,110">
          <Path
            d="M110 128 L98 152 L110 140 L122 152 Z"
            fill={t.fg1}
            transform="translate(0, -80)"
          />
        </G>
        <Circle cx="110" cy="110" r="30" fill={t.surface2} />
        <SvgText
          x="110"
          y="118"
          fontSize="22"
          fontFamily={FONT.bold}
          fill={t.fg1}
          textAnchor="middle"
        >
          {nps >= 0 ? `+${nps}` : nps}
        </SvgText>
      </Svg>
      <View style={{ marginTop: -4 }}>
        <DotBadge label={badge.label} color={badge.color} />
      </View>
    </View>
  );
};
