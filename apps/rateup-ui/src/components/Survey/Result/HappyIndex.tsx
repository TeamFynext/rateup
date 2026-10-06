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
import { useContext } from "react";
import { useTranslation } from "react-i18next";

import { useHappyIndex } from "@/backend/surveys/response/response.query";
import { NPS_COLORS, SCALE_5, SENTIMENT } from "@/components/common/sentimentScale.ts";
import { DotBadge } from "@/components/dashboard/analytics/kit/StatusBadges.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Progress } from "@/components/ui/progress.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import SurveyContext from "@/context/SurveyContext.ts";

const HappinessRing = ({
  percentage,
  color,
  size = 230,
  thickness = 20,
  children,
}: {
  percentage: number;
  color: string;
  size?: number;
  thickness?: number;
  children?: React.ReactNode;
}) => {
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(Math.max(percentage, 0), 100) / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className="stroke-muted"
          strokeWidth={thickness}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={thickness}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
};

/** The happiness index (0–10) bands, worst first; each pairs a label with its scale colour. */
const INDEX_BANDS = [
  { min: 9, label: "Very Happy", color: SENTIMENT.best, dot: "bg-chart-1" },
  { min: 7, label: "Happy", color: SENTIMENT.good, dot: "bg-chart-3" },
  { min: 5, label: "Neutral", color: SENTIMENT.neutral, dot: "bg-muted-foreground/50" },
  { min: 3, label: "Unhappy", color: SENTIMENT.poor, dot: "bg-chart-5" },
  { min: -Infinity, label: "Very Unhappy", color: SENTIMENT.worst, dot: "bg-destructive" },
] as const;

const HappyIndex = ({ surveyId }: { surveyId: string }) => {
  const { t } = useTranslation();
  const { filterTeams } = useContext(SurveyContext);
  const { data, isLoading } = useHappyIndex(surveyId, filterTeams);
  const h_index = Number(((data?.happinessIndex ?? 0) / 10).toFixed(1));

  if (isLoading || !data) return <HappyIndexSkeleton />;

  const moodList = [
    {
      label: t("Very Happy"),
      value: data.veryHappy ?? 0,
      percentage: data.veryHappyPercentage ?? 0,
      icon: IconMoodHappy,
      color: SCALE_5[4],
    },
    {
      label: t("Happy"),
      value: data.happy ?? 0,
      percentage: data.happyPercentage ?? 0,
      icon: IconMoodSmile,
      color: SCALE_5[3],
    },
    {
      label: t("Neutral"),
      value: data.neutral ?? 0,
      percentage: data.neutralPercentage ?? 0,
      icon: IconMoodNeutral,
      color: SCALE_5[2],
    },
    {
      label: t("Unhappy"),
      value: data.sad ?? 0,
      percentage: data.sadPercentage ?? 0,
      icon: IconMoodSad,
      color: SCALE_5[1],
    },
    {
      label: t("Very Unhappy"),
      value: data.verySad ?? 0,
      percentage: data.verySadPercentage ?? 0,
      icon: IconMoodCry,
      color: SCALE_5[0],
    },
  ];

  const npsList = [
    {
      label: t("Promoters"),
      percentage: data.promoterPercentage ?? 0,
      value: data.promoters ?? 0,
      color: NPS_COLORS.promoter,
      icon: IconMoodHappy,
    },
    {
      label: t("Passives"),
      percentage: data.passivePercentage ?? 0,
      value: data.passives ?? 0,
      color: NPS_COLORS.passive,
      icon: IconMoodEmpty,
    },
    {
      label: t("Detractors"),
      percentage: data.detractorPercentage ?? 0,
      value: data.detractors ?? 0,
      color: NPS_COLORS.detractor,
      icon: IconMoodAngry,
    },
  ];

  const band = INDEX_BANDS.find((b) => h_index >= b.min) ?? INDEX_BANDS[INDEX_BANDS.length - 1];

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle className="text-base">{t("Happiness Index")}</CardTitle>
          <CardDescription>{t("How respondents felt, from their scale answers.")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6 md:flex-row">
          <HappinessRing percentage={Number(data.happinessIndex ?? 0)} color={band.color}>
            <div className="flex flex-col items-center gap-2 text-center">
              <div>
                <div className="font-display text-4xl font-bold tabular-nums text-foreground">
                  {h_index.toFixed(1)}
                </div>
                <span className="text-xs text-muted-foreground">{t("Out of 10")}</span>
              </div>
              <DotBadge dotClassName={band.dot} label={t(band.label)} />
            </div>
          </HappinessRing>
          <div className="flex w-full flex-col gap-4">
            {moodList.map(({ label, value, percentage, icon: Icon, color }) => (
              <div key={label} className="flex w-full items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Icon className="size-5 text-primary" aria-hidden />
                </div>
                <div className="flex w-full flex-col gap-1.5">
                  <div className="flex w-full items-baseline justify-between gap-2 text-xs">
                    <span className="font-medium text-foreground">{label}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {value}
                      <span className="ml-2 font-medium text-foreground">
                        {Math.round(percentage)}%
                      </span>
                    </span>
                  </div>
                  <Progress
                    value={percentage}
                    style={{ "--mood-color": color } as React.CSSProperties}
                    className="flex-1 [&_[data-slot=progress-indicator]]:bg-[var(--mood-color)]"
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">{t("NPS Overview")}</CardTitle>
          <CardDescription>{t("Promoters minus detractors, from −100 to +100.")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6">
          <NPSGaugeWithNeedle
            nps={data.nps}
            promoters={data.promoters}
            passives={data.passives}
            detractors={data.detractors}
          />
          <div className="grid w-full grid-cols-3 gap-2">
            {npsList.map(({ label, percentage, value, color, icon: Icon }) => (
              <div key={label} className="flex flex-col items-center gap-1 text-center">
                <Icon className="size-5" style={{ color }} aria-hidden />
                <div className="text-xs font-medium text-muted-foreground">{label}</div>
                <div className="text-2xl font-semibold tabular-nums text-foreground">
                  {percentage}%
                </div>
                <div className="text-xs tabular-nums text-muted-foreground">
                  {t("{count, plural, one {# response} other {# responses}}", { count: value })}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default HappyIndex;

const NPSGaugeWithNeedle = ({
  nps,
  promoters,
  passives,
  detractors,
}: {
  nps: number;
  promoters: number;
  passives: number;
  detractors: number;
}) => {
  const { t } = useTranslation();
  // No NPS answers yet: draw an empty track rather than NaN arcs.
  const total = promoters + passives + detractors || 1;

  const promoterPercent = (promoters / total) * 100;
  const passivePercent = (passives / total) * 100;
  const detractorPercent = (detractors / total) * 100;

  const totalAngle = 180;

  const promoterAngle = (promoterPercent / 100) * totalAngle;
  const passiveAngle = (passivePercent / 100) * totalAngle;
  const detractorAngle = (detractorPercent / 100) * totalAngle;

  const polarToCartesian = (cx: number, cy: number, r: number, angle: number) => {
    const rad = (angle - 90) * (Math.PI / 180);
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
    };
  };

  const getArc = (startAngle: number, sweepAngle: number, radius: number, color: string) => {
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
          className="stroke-muted"
          strokeWidth="20"
        />

        {getArc(currentStartAngle, detractorAngle, 90, NPS_COLORS.detractor)}
        {(() => (currentStartAngle += detractorAngle))()}

        {getArc(currentStartAngle, passiveAngle, 90, NPS_COLORS.passive)}
        {(() => (currentStartAngle += passiveAngle))()}

        {getArc(currentStartAngle, promoterAngle, 90, NPS_COLORS.promoter)}

        {/* Needle */}
        <g transform={`rotate(${rotation}, 110, 110)`}>
          <foreignObject x="100" y="45" width="30" height="60">
            <IconNavigationFilled size={30} className="text-foreground" />
          </foreignObject>
        </g>

        <circle cx="110" cy="110" r="30" className="fill-muted" />
        <text
          x="110"
          y="118"
          textAnchor="middle"
          fontSize="24"
          fontWeight="bold"
          className="fill-foreground"
        >
          {(nps >= 0 ? `+${nps}` : nps) ?? 0}
        </text>
      </svg>

      <div className="-mt-2">
        {nps >= 30 ? (
          <DotBadge dotClassName="bg-chart-1" label={nps >= 50 ? t("Excellent") : t("Great")} />
        ) : nps >= 0 ? (
          <DotBadge dotClassName="bg-chart-5" label={t("Okay")} />
        ) : (
          <DotBadge dotClassName="bg-destructive" label={t("Poor")} />
        )}
      </div>
    </div>
  );
};

const HappyIndexSkeleton = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      {/* Happiness Index Skeleton */}
      <Card className="p-4 lg:col-span-3">
        <Skeleton className="h-6 w-40" />
        <div className="flex gap-4 items-center px-12 py-4">
          <Skeleton className="size-[230px] rounded-full" />
          <div className="flex flex-col gap-4 w-full">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-center gap-2 w-full">
                <Skeleton className="size-[45px] rounded-full" />
                <div className="flex w-full flex-col gap-2">
                  <Skeleton className="h-2 w-[60%]" />
                  <Skeleton className="h-2 w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* NPS Overview Skeleton */}
      <Card className="p-4 lg:col-span-2">
        <Skeleton className="h-6 w-32" />
        <div className="flex flex-col items-center justify-center mt-4 gap-4">
          <Skeleton className="h-[140px] w-[220px]" />
          <div className="flex justify-around w-full mt-4 gap-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="flex flex-col items-center gap-2">
                <Skeleton className="size-[30px] rounded-full" />
                <Skeleton className="h-3 w-[60px]" />
                <Skeleton className="h-6 w-[40px]" />
                <Skeleton className="h-3 w-[80px]" />
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
};
