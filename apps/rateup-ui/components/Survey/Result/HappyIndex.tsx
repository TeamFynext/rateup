"use client";

import React, { useContext } from "react";

import {
  Card,
  Center,
  Progress,
  RingProgress,
  Skeleton,
  Text,
  Title,
} from "@mantine/core";
import {
  IconMoodAngry,
  IconMoodCry,
  IconMoodEmpty,
  IconMoodHappy,
  IconMoodNeutral,
  IconMoodSad,
  IconMoodSmile,
  IconNavigationFilled,
} from "@tabler/icons-react";

import { useHappyIndex } from "@/backend/surveys/response/response.query";
import SurveyContext from "@/context/SurveyContext";

const HappyIndex = ({ surveyId, translations }) => {
  const { filterTeams } = useContext(SurveyContext);
  const { data, isLoading } = useHappyIndex(surveyId, filterTeams);
  const h_index = Number(((data?.happinessIndex ?? 0) / 10).toFixed(1));

  if (isLoading || !data) return <HappyIndexSkeleton />;

  const moodList = [
    {
      label: "Very Happy",
      value: data.veryHappy ?? 0,
      percentage: data.veryHappyPercentage ?? 0,
      icon: IconMoodHappy,
      color: "#00BF83",
    },
    {
      label: "Happy",
      value: data.happy ?? 0,
      percentage: data.happyPercentage ?? 0,
      icon: IconMoodSmile,
      color: "#66BF00",
    },
    {
      label: "Neutral",
      value: data.neutral ?? 0,
      percentage: data.neutralPercentage ?? 0,
      icon: IconMoodNeutral,
      color: "#FFC107",
    },
    {
      label: "Unhappy",
      value: data.sad ?? 0,
      percentage: data.sadPercentage ?? 0,
      icon: IconMoodSad,
      color: "#FF8B07",
    },
    {
      label: "Very Unhappy",
      value: data.verySad ?? 0,
      percentage: data.verySadPercentage ?? 0,
      icon: IconMoodCry,
      color: "#FF6161",
    },
  ];

  const npsList = [
    {
      label: "Promoters",
      percentage: data.promoterPercentage ?? 0,
      value: data.promoters ?? 0,
      color: "#00BF83",
      icon: IconMoodHappy,
      bg: "#00BF831F",
    },
    {
      label: "Passives",
      percentage: data.passivePercentage ?? 0,
      value: data.passives ?? 0,
      color: "#FFC107",
      icon: IconMoodEmpty,
      bg: "#FFC1071F",
    },
    {
      label: "Detractors",
      percentage: data.detractorPercentage ?? 0,
      value: data.detractors ?? 0,
      color: "#FF6161",
      icon: IconMoodAngry,
      bg: "#FF61611F",
    },
  ];

  let happinessIndexStatus, happyIndexStatusBg;

  if (h_index >= 9) {
    happinessIndexStatus = "Very Happy";
    happyIndexStatusBg = "#00BF83";
  } else if (h_index >= 7) {
    happinessIndexStatus = "Happy";
    happyIndexStatusBg = "#66BF00";
  } else if (h_index >= 5) {
    happinessIndexStatus = "Neutral";
    happyIndexStatusBg = "#FFC107";
  } else if (h_index >= 3) {
    happinessIndexStatus = "Unhappy";
    happyIndexStatusBg = "#FF8B07";
  } else {
    happinessIndexStatus = "Very Unhappy";
    happyIndexStatusBg = "#FF6161";
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      {/* Happiness Index - 60% */}
      <Card
        shadow="sm"
        radius="md"
        className="p-4 border border-[#E2E5ED] col-span-1 lg:col-span-3"
      >
        <Title order={4}>Happiness Index</Title>
        <div className="flex flex-col gap-4 items-center px-12 py-4 md:flex-row lg:flex-row">
          <RingProgress
            size={230}
            thickness={20}
            sections={[
              {
                value: Number(data.happinessIndex ?? 0),
                color: happyIndexStatusBg,
              },
            ]}
            label={
              <Center>
                <div className="text-center flex flex-col justify-between items-center gap-2">
                  <div>
                    <div className="text-4xl font-bold">
                      {(Number(data?.happinessIndex ?? 0) / 10).toFixed(1)}
                    </div>
                    <Text size="xs" c="dimmed">
                      Out of 10
                    </Text>
                  </div>
                  <div
                    style={{ backgroundColor: happyIndexStatusBg }}
                    className="text-white p-1 text-xs rounded-sm flex justify-center items-center"
                  >
                    {happinessIndexStatus}
                  </div>
                </div>
              </Center>
            }
          />
          <div className="flex flex-col gap-4 w-full">
            {moodList?.map(
              ({ label, value, percentage, icon: Icon, color }) => (
                <div key={label} className="flex items-center gap-2 w-full">
                  <div className="bg-[#004F981F] rounded-full p-0.5">
                    <Icon color={"#004F98"} size={45} />
                  </div>
                  <div className="flex w-full flex-col justify-center gap-2 items-start">
                    <div className="flex w-full justify-between">
                      <Text size="xs" c={"#343A40"} style={{ fontWeight: 700 }}>
                        {label}
                      </Text>
                      <div className="flex items-center justify-center gap-1">
                        <Text size="xs" c="#7A8289">
                          ({value ?? 0})
                        </Text>
                        <div className="bg-[#004F98] max-w-10 px-3 py-0.5 rounded-full flex items-center justify-center">
                          <Text size="xs" c="white">
                            {Math.round(percentage)}%
                          </Text>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 w-full">
                      <Progress
                        color={color}
                        value={percentage}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>
              ),
            )}
          </div>
        </div>
      </Card>

      {/* NPS Overview  */}
      <Card
        shadow="sm"
        radius="md"
        className="p-4 border border-[#E2E5ED] col-span-1 lg:col-span-2"
      >
        <Title order={4}>NPS Overview</Title>
        <div className="flex flex-col items-center justify-center mt-4 gap-4">
          <NPSGaugeWithNeedle
            nps={data.nps}
            promoters={data.promoters}
            passives={data.passives}
            detractors={data.detractors}
          />
          <div className="flex justify-around w-full mt-4">
            {npsList?.map(
              ({ label, percentage, value, color, icon: Icon, bg }) => (
                <div key={label} className="flex flex-col items-center">
                  <div className="rounded-full" style={{ backgroundColor: bg }}>
                    <Icon color={color} width={25} height={25} />
                  </div>
                  <div className="text-xs font-medium">{label}</div>
                  <div className="font-bold text-3xl" style={{ color }}>
                    {percentage}%
                  </div>
                  <div className="bg-[#F5F5F5] px-2 py-0.5 text-[#7A8289] text-xs rounded-full font-medium">
                    {value} Responses
                  </div>
                </div>
              ),
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default HappyIndex;

const NPSGaugeWithNeedle = ({ nps, promoters, passives, detractors }) => {
  const total = promoters + passives + detractors;

  const promoterPercent = (promoters / total) * 100;
  const passivePercent = (passives / total) * 100;
  const detractorPercent = (detractors / total) * 100;

  const totalAngle = 180;

  const promoterAngle = (promoterPercent / 100) * totalAngle;
  const passiveAngle = (passivePercent / 100) * totalAngle;
  const detractorAngle = (detractorPercent / 100) * totalAngle;

  const polarToCartesian = (cx, cy, r, angle) => {
    const rad = (angle - 90) * (Math.PI / 180);
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
    };
  };

  const getArc = (startAngle, sweepAngle, radius, color) => {
    const endAngle = startAngle + sweepAngle;
    const start = polarToCartesian(110, 110, radius, endAngle);
    const end = polarToCartesian(110, 110, radius, startAngle);
    const largeArcFlag = sweepAngle > 180 ? 1 : 0;

    return (
      <path
        d={`M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`}
        stroke={color}
        strokeWidth="26"
        fill="none"
      />
    );
  };

  const rotation = ((nps + 100) / 200) * 180 - 90;
  let currentStartAngle = -90;

  return (
    <div className="flex flex-col items-center justify-center">
      <svg width="220" height="140" viewBox="0 0 220 160">
        {/* Background track */}
        <path
          d="M 20 110 A 90 90 0 0 1 200 110"
          fill="none"
          stroke="#f3f4f6"
          strokeWidth="20"
        />

        {/* Promoters */}
        {getArc(currentStartAngle, detractorAngle, 90, "#FF6161")}
        {(() => (currentStartAngle += detractorAngle))()}

        {/* Passives */}
        {getArc(currentStartAngle, passiveAngle, 90, "#FFC107")}
        {(() => (currentStartAngle += passiveAngle))()}

        {/* Detractors */}
        {getArc(currentStartAngle, promoterAngle, 90, "#00BF83")}

        {/* Needle */}
        <g transform={`rotate(${rotation}, 110, 110)`}>
          <foreignObject x="100" y="45" width="30" height="60">
            <IconNavigationFilled
              color="#343A40"
              size={30}
              style={{ transform: "rotate(0deg)" }}
            />
          </foreignObject>
        </g>

        {/* Center Circle */}
        <circle cx="110" cy="110" r="30" fill="#F5F5F5" />
        <text
          x="110"
          y="118"
          textAnchor="middle"
          fontSize="24"
          fontWeight="bold"
          fill="#343A40"
        >
          {(nps >= 0 ? `+${nps}` : nps) ?? 0}
        </text>
      </svg>

      {/* Label below */}
      <div className="-mt-2 text-center">
        <span
          className={`text-xs text-white py-1 px-3 rounded-sm font-medium ${
            nps >= 50
              ? "bg-[#00BF83]"
              : nps >= 30
                ? "bg-[#00BF83]"
                : nps >= 0
                  ? "bg-[#FFC107]"
                  : "bg-[#FF6161]"
          }`}
        >
          {nps >= 50
            ? "Excellent"
            : nps >= 30
              ? "Great"
              : nps >= 0
                ? "Okay"
                : "Poor"}
        </span>
      </div>
    </div>
  );
};

const HappyIndexSkeleton = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      {/* Happiness Index Skeleton */}
      <Card
        shadow="sm"
        radius="md"
        className="p-4 border border-[#E2E5ED] col-span-1 lg:col-span-3"
      >
        <Title order={4}>Happiness Index</Title>
        <div className="flex gap-4 items-center px-12 py-4">
          <Skeleton height={230} circle />
          <div className="flex flex-col gap-4 w-full">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-center gap-2 w-full">
                <Skeleton height={45} width={45} radius="xl" />
                <div className="flex w-full flex-col gap-2">
                  <Skeleton height={8} width="60%" />
                  <Skeleton height={8} width="100%" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* NPS Overview Skeleton */}
      <Card
        shadow="sm"
        radius="md"
        className="p-4 border border-[#E2E5ED] col-span-1 lg:col-span-2"
      >
        <Title order={4}>NPS Overview</Title>
        <div className="flex flex-col items-center justify-center mt-4 gap-4">
          <Skeleton width={220} height={140} />
          <div className="flex justify-around w-full mt-4 gap-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="flex flex-col items-center gap-2">
                <Skeleton circle height={30} width={30} />
                <Skeleton height={12} width={60} />
                <Skeleton height={24} width={40} />
                <Skeleton height={12} width={80} />
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
};
