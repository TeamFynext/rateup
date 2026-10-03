import { IconStar, IconThumbDownFilled, IconThumbUpFilled } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge.tsx";
import { QuestionType, WaQuestions } from "@/types/enums.ts";
import type { AnyQuestionType } from "@/utils/response.ts";
import {
  getResponseArrayByQuestionType,
  getResponseArrayByQuestionTypeV2,
} from "@/utils/response.ts";

/** One aggregated choice bucket in a question's result chart. */
interface ChartDatum {
  choice: string | number;
  count: number;
  percentage?: string | number;
  [key: string]: unknown;
}

const SurveyResultByType = ({
  questionType,
  chartData,
  version,
}: {
  questionType: AnyQuestionType;
  chartData: ChartDatum[];
  version?: string | number;
}) => {
  const { t } = useTranslation();
  const isSmiley = questionType === QuestionType.Smiley;
  const responseArray =
    version === 2 && isSmiley
      ? getResponseArrayByQuestionTypeV2(questionType)
      : getResponseArrayByQuestionType(questionType);

  const getResObj = (val: string | number) =>
    chartData.find((res) => res?.choice?.toString() === val?.toString());

  const getMostVotedChoice = () => {
    const maxCount = Math.max(...chartData?.map((c) => c.count));
    return chartData.find((c) => c.count === maxCount)?.choice;
  };

  const mostVotedChoice = getMostVotedChoice();

  /** One answer: its label, its votes, and a bar in the answer's own scale colour. */
  const renderStatRow = ({
    label,
    value: res,
    isMostVoted,
    badge = null,
  }: {
    label: ReactNode;
    value: ChartDatum | undefined;
    isMostVoted?: boolean;
    badge?: ReactNode;
  }) => {
    const percentage = Number(res?.percentage ?? 0);
    const color = typeof res?.fill === "string" ? res.fill : "var(--chart-2)";
    return (
      <div key={label?.toString()} className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="flex min-w-0 items-center gap-2 font-medium text-foreground">
            <span className="truncate">{badge ?? label}</span>
            {isMostVoted && (
              <Badge variant="secondary" className="shrink-0">
                {t("Most voted")}
              </Badge>
            )}
          </span>
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
            {t("{count, plural, one {# vote} other {# votes}}", { count: res?.count ?? 0 })}
            <span className="ml-2 font-medium text-foreground">{percentage}%</span>
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full"
            style={{ width: `${percentage}%`, backgroundColor: color }}
          />
        </div>
      </div>
    );
  };

  const renderAll = (renderFn: () => ReactNode) => (
    <div className="flex max-h-125 flex-col gap-4 overflow-y-auto overscroll-contain pr-1">
      {renderFn()}
    </div>
  );

  const getValue = (res: ChartDatum | undefined) => res;

  // --- Types ---
  switch (questionType) {
    // Opinion, MCQ, Dropdown, etc.
    case QuestionType.Opinion:
    case WaQuestions.Opinion:
    case QuestionType.MCQ:
    case QuestionType.MSQ:
    case QuestionType.CustomNPS:
    case QuestionType.DDMS:
    case QuestionType.DDSS:
    case QuestionType.MCQGrid:
    case WaQuestions.RadioButtonsGroup:
    case WaQuestions.Dropdown:
    case WaQuestions.CheckboxGroup:
      return renderAll(() =>
        chartData?.map((item) => {
          const res = getResObj(item.choice);
          return renderStatRow({
            label: item.choice,
            value: getValue(res),
            isMostVoted: item.choice.toString() === mostVotedChoice?.toString(),
            badge: item.choice,
          });
        }),
      );

    // Rating
    case QuestionType.Rating:
    case WaQuestions.Rating:
      return renderAll(() => {
        return chartData?.map((item) => {
          const res = getResObj(item.choice);
          if (version === 2) {
            return renderStatRow({
              label: item.choice,
              value: getValue(res),
              isMostVoted: item.choice.toString() === mostVotedChoice?.toString(),
              badge: null,
            });
          } else {
            return renderStatRow({
              label: (
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: Number(item.choice) }, (_, i) => (
                    <IconStar key={i} className="size-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
              ),
              value: getValue(res),
              isMostVoted: item.choice.toString() === mostVotedChoice?.toString(),
              badge: null,
            });
          }
        });
      });

    // Like / Dislike
    case QuestionType.LD:
    case WaQuestions.LD:
      return renderAll(() =>
        chartData?.map((item) => {
          const res = getResObj(item.choice);
          const isMost = item.choice === mostVotedChoice;
          const icon =
            item.choice === "Like" ? (
              <IconThumbUpFilled className="size-4 text-primary" />
            ) : (
              <IconThumbDownFilled className="size-4 text-destructive" />
            );
          if (version === 2) {
            return renderStatRow({
              label: (
                <div className="flex items-center gap-1">
                  <span>{item.choice}</span>
                </div>
              ),
              value: getValue(res),
              isMostVoted: isMost,
              badge: null,
            });
          } else {
            return renderStatRow({
              label: (
                <div className="flex items-center gap-1">
                  {icon}
                  <span>{item.choice}</span>
                </div>
              ),
              value: getValue(res),
              isMostVoted: isMost,
              badge: null,
            });
          }
        }),
      );

    // Yes / No
    case QuestionType.YN:
    case WaQuestions.YN:
      return renderAll(() =>
        responseArray?.map((item) => {
          const res = getResObj(item.value);
          return renderStatRow({
            label: item.value,
            value: getValue(res),
            isMostVoted: item.value === mostVotedChoice,
            badge: item.value,
          });
        }),
      );

    // Smiley
    case QuestionType.Smiley:
      return renderAll(() => {
        return responseArray?.map((item) => {
          const res = getResObj(item.value);
          const Icon = item.Icon;
          return renderStatRow({
            label: (
              <div className="flex items-center gap-2">
                {version !== 2 && Icon && <Icon size={20} color={item.color} stroke={2} />}
                <span>{item.value}</span>
              </div>
            ),
            value: getValue(res),
            isMostVoted: item.value === mostVotedChoice,
            badge: null,
          });
        });
      });

    // Fallback
    default:
      return renderAll(() =>
        chartData.map((res) =>
          renderStatRow({
            label: res.choice,
            value: getValue(res),
            isMostVoted: res.choice === mostVotedChoice,
            badge: res.choice,
          }),
        ),
      );
  }
};

export default SurveyResultByType;
