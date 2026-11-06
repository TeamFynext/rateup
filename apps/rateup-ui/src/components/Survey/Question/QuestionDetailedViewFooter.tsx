import {
  IconAppWindow,
  IconAsterisk,
  IconChartBar,
  IconDots,
  IconEdit,
  IconVariable,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip.tsx";
import { cn } from "@/lib/utils.ts";
import { PageType, QuestionType } from "@/types/enums.ts";
import { imagesPath, NPSQuestions } from "@/utils/constants.ts";
import {
  googleReviewSupportedTypes,
  logicSupportedTypes,
  validationSupportedTypes,
} from "@/utils/data.ts";

import { QuestionTabsEnum } from "../EditSurvey.tsx";

interface QuestionDetailedViewFooterProps {
  question: Question;
  required: boolean;
  enableNpsAnalytics: boolean;
  onRequiredChange: (checked: boolean) => void;
  onNpsAnalyticsChange: (checked: boolean) => void;
  setActiveTab: (tab: QuestionTabsEnum) => void;
  isGoogleReviewFeatureActive: boolean;
  handleSave: () => Promise<string>;
  className?: string;
}

function QuestionDetailedViewFooter({
  question,
  required,
  enableNpsAnalytics,
  onRequiredChange,
  onNpsAnalyticsChange,
  setActiveTab,
  isGoogleReviewFeatureActive,
  handleSave,
  className,
}: QuestionDetailedViewFooterProps) {
  const { t: translations } = useTranslation();

  const isRequiredDisabled =
    [QuestionType.InfoMessage, QuestionType.EmailOtp].includes(question.type as QuestionType) ||
    question.type in PageType;

  return (
    <div className={className ?? "flex items-center gap-1 px-4 py-3"}>
      {/* Required toggle */}
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              onClick={() => !isRequiredDisabled && onRequiredChange(!required)}
              disabled={isRequiredDisabled}
              className={cn(
                "flex size-7 items-center justify-center rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                required
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            />
          }
        >
          <IconAsterisk className="size-3.5" />
        </TooltipTrigger>
        <TooltipContent side="bottom">{translations("Required")}</TooltipContent>
      </Tooltip>

      {/* NPS Analytics toggle */}
      {NPSQuestions.includes(question?.type as QuestionType) && (
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                onClick={() => onNpsAnalyticsChange(!enableNpsAnalytics)}
                className={cn(
                  "flex size-7 items-center justify-center rounded-md transition-colors",
                  enableNpsAnalytics
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              />
            }
          >
            <IconChartBar className="size-3.5" />
          </TooltipTrigger>
          <TooltipContent side="bottom">{translations("NPS Analytics")}</TooltipContent>
        </Tooltip>
      )}

      {/* Actions dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              aria-label={translations("More actions")}
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground hover:text-foreground"
            />
          }
        >
          <IconDots className="size-3.5" />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={() => setActiveTab(QuestionTabsEnum.VariableEditor)}>
            <IconVariable />
            {translations("Variables")}
          </DropdownMenuItem>

          {logicSupportedTypes.includes(question?.type as QuestionType) && (
            <DropdownMenuItem onClick={() => setActiveTab(QuestionTabsEnum.LogicEditor)}>
              <img src={`${imagesPath}/logic-jump.svg`} className="size-4" alt="logic jump icon" />
              {translations("Logic Jump")}
            </DropdownMenuItem>
          )}

          {googleReviewSupportedTypes.includes(question?.type as QuestionType) && (
            <DropdownMenuItem
              onClick={async () => {
                if (!isGoogleReviewFeatureActive) return;
                const save = await handleSave();
                if (save === "saved") setActiveTab(QuestionTabsEnum.QuestionReviewPageEditor);
              }}
              disabled={!isGoogleReviewFeatureActive}
            >
              <IconAppWindow />
              Review Page
              {!isGoogleReviewFeatureActive && (
                <span className="ml-auto text-xs text-muted-foreground">
                  {translations("Upgrade")}
                </span>
              )}
            </DropdownMenuItem>
          )}

          {validationSupportedTypes.includes(question?.type as QuestionType) && (
            <DropdownMenuItem
              onClick={async () => {
                const save = await handleSave();
                if (save === "saved") setActiveTab(QuestionTabsEnum.ValidationRulesEditor);
              }}
            >
              <IconEdit />
              {translations("Custom Validation")}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export default QuestionDetailedViewFooter;
