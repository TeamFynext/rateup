import { useColorScheme } from "nativewind";
import { View, Text as RNText } from "react-native";
import React from "react";
import { useHappyIndex } from "@/api/response/response.query";
import { AngryIcon, LaughIcon, MehIcon } from "lucide-react-native";
import Svg, { Path, G, Circle, Text as SvgText } from "react-native-svg";

const NpsOverview = ({ surveyId }: { surveyId: string }) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const { data, isLoading } = useHappyIndex(surveyId);

  const npsList = [
    {
      label: "Promoters",
      percentage: data?.promoterPercentage ?? 0,
      value: data?.promoters ?? 0,
      color: "#00BF83",
      icon: LaughIcon,
      bg: "#00BF831F",
    },
    {
      label: "Passives",
      percentage: data?.passivePercentage ?? 0,
      value: data?.passives ?? 0,
      color: "#FFC107",
      icon: MehIcon,
      bg: "#FFC1071F",
    },
    {
      label: "Detractors",
      percentage: data?.detractorPercentage ?? 0,
      value: data?.detractors ?? 0,
      color: "#FF6161",
      icon: AngryIcon,
      bg: "#FF61611F",
    },
  ];

  if (isLoading) {
    return (
      <View className="p-4 bg-white dark:bg-slate-950 flex-1 space-y-4">
        {/* Title Placeholder */}
        <View className="h-6 w-32 bg-gray-200 dark:bg-slate-700 rounded" />

        {/* Gauge Placeholder */}
        <View className="w-[220px] h-[140px] bg-gray-200 dark:bg-slate-700 rounded-full self-center" />

        {/* Response Boxes Placeholder */}
        <View className="space-y-3 mt-4">
          {[...Array(3)].map((_, i) => (
            <View
              key={i}
              className="flex-row items-center justify-between bg-[#FAFAFA] dark:bg-slate-900 p-3 rounded-xl"
            >
              <View className="flex-row items-center space-x-3">
                <View className="w-10 h-10 bg-gray-200 dark:bg-slate-700 rounded-full" />

                <View>
                  <View className="h-4 w-24 bg-gray-200 dark:bg-slate-700 rounded mb-1" />

                  <View className="h-3 w-20 bg-gray-200 dark:bg-slate-700 rounded" />
                </View>
              </View>

              <View className="h-6 w-10 bg-gray-200 dark:bg-slate-700 rounded" />
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View className="p-4 bg-white dark:bg-slate-950 flex-1">
      <RNText className="text-lg font-semibold text-black dark:text-white">
        NPS Overview
      </RNText>

      <View className="flex flex-col items-center justify-center mt-4 space-y-4">
        <NPSGaugeWithNeedle
          nps={data?.nps}
          promoters={data?.promoters}
          passives={data?.passives}
          detractors={data?.detractors}
          isDark={isDark}
        />

        <View className="flex bg-white dark:bg-slate-950 justify-around w-full mt-4 gap-4">
          {npsList.map(
            ({ label, percentage, value, color, bg, icon: Icon }, index) => (
              <View
                key={index}
                className="flex flex-row items-center justify-between p-4 rounded-2xl border"
                style={{
                  backgroundColor: isDark ? "#0f172a" : "#FAFAFA",
                  borderColor: isDark ? "#1e293b" : "#E5E7EB",
                }}
              >
                <View className="flex flex-row items-center justify-center">
                  <View
                    className="rounded-full p-2"
                    style={{ backgroundColor: bg }}
                  >
                    <Icon color={color} width={30} height={30} />
                  </View>

                  <View className="flex items-start px-3">
                    <RNText className="text-lg font-medium text-black dark:text-white">
                      {label}
                    </RNText>

                    <RNText className="text-sm text-[#7A8289] dark:text-slate-400 font-medium">
                      {value} Responses
                    </RNText>
                  </View>
                </View>

                <RNText className="text-3xl font-bold" style={{ color }}>
                  {percentage}%
                </RNText>
              </View>
            ),
          )}
        </View>
      </View>
    </View>
  );
};

export default NpsOverview;

const polarToCartesian = (cx: number, cy: number, r: number, angle: number) => {
  const rad = (angle - 90) * (Math.PI / 180);

  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
};

const getArc = (
  startAngle: number,
  sweepAngle: number,
  radius: number,
  color: string,
) => {
  const endAngle = startAngle + sweepAngle;

  const start = polarToCartesian(110, 110, radius, endAngle);

  const end = polarToCartesian(110, 110, radius, startAngle);

  const largeArcFlag = sweepAngle > 180 ? 1 : 0;

  return (
    <Path
      d={`M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`}
      stroke={color}
      strokeWidth={26}
      fill="none"
    />
  );
};

const NPSGaugeWithNeedle = ({
  nps,
  promoters,
  passives,
  detractors,
  isDark,
}: {
  nps: number;
  promoters: number;
  passives: number;
  detractors: number;
  isDark: boolean;
}) => {
  nps = typeof nps === "number" && !isNaN(nps) ? nps : 0;

  promoters =
    typeof promoters === "number" && !isNaN(promoters) ? promoters : 0;

  passives = typeof passives === "number" && !isNaN(passives) ? passives : 0;

  detractors =
    typeof detractors === "number" && !isNaN(detractors) ? detractors : 0;

  const total = promoters + passives + detractors || 1;

  const promoterPercent = (promoters / total) * 100;

  const passivePercent = (passives / total) * 100;

  const detractorPercent = (detractors / total) * 100;

  const totalAngle = 180;

  const promoterAngle = (promoterPercent / 100) * totalAngle;

  const passiveAngle = (passivePercent / 100) * totalAngle;

  const detractorAngle = (detractorPercent / 100) * totalAngle;

  let currentStartAngle = -90;

  const rotation = ((nps + 100) / 200) * 180 - 90;

  const getLabel = (nps: number) => {
    if (nps >= 50)
      return {
        label: "Excellent",
        bg: "bg-[#00BF83]",
      };

    if (nps >= 30)
      return {
        label: "Great",
        bg: "bg-[#00BF83]",
      };

    if (nps >= 0)
      return {
        label: "Okay",
        bg: "bg-[#FFC107]",
      };

    return {
      label: "Poor",
      bg: "bg-[#FF6161]",
    };
  };

  const { label, bg } = getLabel(nps);

  return (
    <View className="flex flex-col items-center justify-center bg-white dark:bg-slate-950">
      <Svg width="220" height="140" viewBox="0 0 220 160">
        {/* Background Track */}
        <Path
          d="M 20 110 A 90 90 0 0 1 200 110"
          fill="none"
          stroke={isDark ? "#334155" : "#f3f4f6"}
          strokeWidth={20}
        />

        {/* Arcs */}
        <SvgText>
          {getArc(currentStartAngle, detractorAngle, 90, "#FF6161")}

          {(currentStartAngle += detractorAngle)}

          {getArc(currentStartAngle, passiveAngle, 90, "#FFC107")}

          {(currentStartAngle += passiveAngle)}

          {getArc(currentStartAngle, promoterAngle, 90, "#00BF83")}
        </SvgText>

        {/* Needle */}
        <G rotation={rotation} origin="110,110">
          <Path
            d="M110 128 L98 152 L110 140 L122 152 Z"
            fill={isDark ? "#CBD5E1" : "#1E293B"}
            transform="translate(0, -80)"
          />
        </G>

        <Circle
          cx="110"
          cy="110"
          r="30"
          fill={isDark ? "#1e293b" : "#F5F5F5"}
        />

        <SvgText
          x="110"
          y="118"
          fontSize="20"
          fontWeight="bold"
          fill={isDark ? "#ffffff" : "#1E293B"}
          textAnchor="middle"
        >
          {nps >= 0 ? `+${nps}` : nps}
        </SvgText>
      </Svg>

      {/* Label */}
      <View className="-mt-2">
        <RNText
          className={`text-xs text-white py-1 px-3 rounded-sm font-medium ${bg}`}
        >
          {label}
        </RNText>
      </View>
    </View>
  );
};
