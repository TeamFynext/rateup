import { Rating } from "@mantine/core"; // Rating
import { IconThumbDownFilled, IconThumbUpFilled } from "@tabler/icons-react";

import { QuestionType, WaQuestions } from "../../../types/enums";
import {
  getResponseArrayByQuestionType,
  getResponseArrayByQuestionTypeV2,
} from "../../../utils/response";

const SurveyResultByType = ({ questionType, chartData, version }) => {
  const isSmiley = questionType === QuestionType.Smiley;
  const responseArray =
    version === 2 && isSmiley
      ? getResponseArrayByQuestionTypeV2(questionType)
      : getResponseArrayByQuestionType(questionType);

  const getResObj = (val) =>
    chartData.find((res) => res?.choice?.toString() === val?.toString());

  const getVoteText = (count) => (count > 1 ? "votes" : "vote");

  const getMostVotedChoice = () => {
    const maxCount = Math.max(...chartData?.map((c) => c.count));
    return chartData.find((c) => c.count === maxCount)?.choice;
  };

  const mostVotedChoice = getMostVotedChoice();

  const renderStatRow = ({ label, value, isMostVoted, badge = null }) => (
    <div
      key={label?.toString()}
      className={`flex justify-start gap-4 items-center rounded-md px-3 py-2`}
    >
      <div className="flex items-center gap-4">
        {badge ? (
          <div
            className={`min-w-[36px] h-[28px] px-2 border border-[#004F98] text-[#004F98] rounded-sm text-sm font-semibold flex justify-center items-center
           ${isMostVoted && "bg-[#C4D7F5]"}`}
          >
            {badge}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-[#343A40] font-medium">
            {label}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className="bg-[#F5F5F5] px-2 py-0.5 rounded-full text-xs font-semibold text-[#343A40]">
          {value}
        </span>
        {isMostVoted && (
          <span className="text-[#004F98] bg-[#C4D7F5] text-[10px] px-2 py-0.5 rounded-full font-semibold">
            Most Voted
          </span>
        )}
      </div>
    </div>
  );

  const renderAll = (renderFn) => (
    <div className="space-y-2 max-h-[500px]">{renderFn()}</div>
  );

  const getValue = (res) =>
    res
      ? `${res.count} ${getVoteText(res.count)} (${res.percentage}%)`
      : "0 vote (0.00%)";

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
      return renderAll(() =>
        responseArray?.map((item) => {
          const res = getResObj(item.value);
          return renderStatRow({
            label: (
              <Rating
                value={Number(item.value)}
                count={Number(item.value)}
                readOnly
                color="blue"
              />
            ),
            value: getValue(res),
            isMostVoted: item.value.toString() === mostVotedChoice?.toString(),
            badge: null,
          });
        }),
      );

    // Like / Dislike
    case QuestionType.LD:
    case WaQuestions.LD:
      return renderAll(() =>
        responseArray?.map((item) => {
          const res = getResObj(item.value);
          const isMost = item.value === mostVotedChoice;
          const icon =
            item.value === "Like" ? (
              <IconThumbUpFilled color="#00BF83" />
            ) : (
              <IconThumbDownFilled color="#FF6161" />
            );
          return renderStatRow({
            label: (
              <div className="flex items-center gap-1">
                {icon}
                <span>{item.value}</span>
              </div>
            ),
            value: getValue(res),
            isMostVoted: isMost,
            badge: null,
          });
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
                {version !== 2 && (
                  <Icon size={20} color={item.color} stroke={2} />
                )}
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
