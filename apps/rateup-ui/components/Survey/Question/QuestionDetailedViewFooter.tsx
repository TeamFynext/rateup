"use client";

import Image from "next/image";

import {
  IconAppWindow,
  IconChevronDown,
  IconDeviceSdCard,
  IconEdit,
  IconTicket,
  IconVariable,
} from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { PageType, QuestionType } from "@/types/enums";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { NPSQuestions } from "@/utils/constants";
import {
  googleReviewSupportedTypes,
  logicSupportedTypes,
  ticketIssueSupportedTypes,
  validationSupportedTypes,
} from "@/utils/data";

import { QuestionTabsEnum } from "../EditSurvey";

function QuestionDetailedViewFooter({
  question,
  form,
  setActiveTab,
  isGoogleReviewFeatureActive,
  handleSave,
  isTicketFeatureActive,
  getIncompleteLanguages,
  selectedLanguage,
  isSaving,
  enableAutoGenerateTicket,
}) {
  const translations = useTranslations();
  return (
    <div className="flex justify-between items-center">
      <div className="flex items-center gap-4">
        <div
          className="flex items-center"
          style={{
            marginRight: !NPSQuestions.includes(question?.type as QuestionType)
              ? "100px"
              : undefined,
          }}
        >
          <Checkbox
            id="required-checkbox"
            checked={!!form.values.required}
            onCheckedChange={(val) => {
              const checked = Boolean(val);
              form.setFieldValue("required", checked);
            }}
            disabled={
              [QuestionType.InfoMessage, QuestionType.EmailOtp].includes(
                question.type,
              ) || question.type in PageType
            }
            className="mr-2" // small spacing between box and label
          />

          <label
            htmlFor="required-checkbox"
            className="select-none font-semibold"
          >
            {translations("Required")}
          </label>
        </div>

        {NPSQuestions.includes(question?.type as QuestionType) && (
          <div className="flex items-center">
            <Checkbox
              id="nps-analytics-checkbox"
              checked={!!form.values.enableNpsAnalytics}
              onCheckedChange={(val) => {
                form.setFieldValue("enableNpsAnalytics", Boolean(val));
              }}
              className="mr-2"
            />

            <label
              htmlFor="nps-analytics-checkbox"
              className="select-none font-semibold"
            >
              {translations("NPS Analytics")}
            </label>
          </div>
        )}

        <div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="lg"
                className="inline-flex items-center gap-2 rounded-lg"
              >
                <span className="text-sm font-bold">
                  {translations("Actions")}
                </span>
                <IconChevronDown size={16} />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuPortal>
              <DropdownMenuContent>
                <DropdownMenuItem>
                  <Button
                    className="w-full flex items-center justify-center gap-1"
                    variant="outline"
                    onClick={() =>
                      setActiveTab(QuestionTabsEnum.VariableEditor)
                    }
                  >
                    <IconVariable />
                    <span>{translations("Variables")}</span>
                  </Button>
                </DropdownMenuItem>

                {logicSupportedTypes.includes(question?.type) && (
                  <DropdownMenuItem>
                    <Button
                      className="w-full flex items-center justify-center gap-1"
                      variant="outline"
                      onClick={() => setActiveTab(QuestionTabsEnum.LogicEditor)}
                    >
                      <Image
                        src={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/logic-jump.svg`}
                        width={24}
                        height={24}
                        alt="logic jump"
                      />
                      <span>{translations("Logic Jump")}</span>
                    </Button>
                  </DropdownMenuItem>
                )}

                {googleReviewSupportedTypes.includes(question?.type) && (
                  <DropdownMenuItem className="p-0">
                    {isGoogleReviewFeatureActive ? (
                      <Button
                        className="w-full flex items-center justify-center gap-1"
                        variant="outline"
                        onClick={async () => {
                          const save = await handleSave();
                          if (save === "saved") {
                            setActiveTab(
                              QuestionTabsEnum.QuestionReviewPageEditor,
                            );
                          }
                        }}
                      >
                        <IconAppWindow />
                        <span>{translations("Review Page")}</span>
                      </Button>
                    ) : (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              onClick={(e) => e.preventDefault()}
                              className="w-full flex items-center justify-center gap-1 opacity-50 cursor-not-allowed"
                            >
                              <IconAppWindow />
                              <span>{translations("Review Page")}</span>
                            </Button>
                          </TooltipTrigger>

                          <TooltipContent side="top">
                            {translations("Upgrade your Plan for this feature")}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </DropdownMenuItem>
                )}

                {validationSupportedTypes.includes(
                  question?.type as QuestionType,
                ) && (
                  <DropdownMenuItem>
                    <Button
                      className="w-full flex items-center justify-center gap-1"
                      variant="outline"
                      onClick={async () => {
                        let save = await handleSave();
                        save === "saved" &&
                          setActiveTab(QuestionTabsEnum.ValidationRulesEditor);
                      }}
                    >
                      <IconEdit />
                      <span>{translations("Custom Validation")}</span>
                    </Button>
                  </DropdownMenuItem>
                )}

                {ticketIssueSupportedTypes.includes(
                  question?.type as QuestionType,
                ) && (
                  <DropdownMenuItem>
                    {isTicketFeatureActive && !enableAutoGenerateTicket ? (
                      <Button
                        className="w-full flex items-center justify-center gap-1"
                        variant="outline"
                        onClick={async () => {
                          let save = await handleSave();
                          save === "saved" &&
                            setActiveTab(QuestionTabsEnum.TicketIssueEditor);
                        }}
                      >
                        <IconTicket />
                        <span>{translations("Create Tickets")}</span>
                      </Button>
                    ) : (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              onClick={(event) => event.preventDefault()}
                              className="w-full flex items-center justify-center gap-1 opacity-50 cursor-not-allowed"
                            >
                              <IconTicket />
                              <span>{translations("Create Tickets")}</span>
                            </Button>
                          </TooltipTrigger>

                          <TooltipContent side="top">
                            {isTicketFeatureActive
                              ? translations(
                                  "Upgrade your Plan for this feature",
                                )
                              : translations(
                                  "Auto-Generate Ticket is enabled on this survey",
                                )}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenuPortal>
          </DropdownMenu>
        </div>
      </div>

      <div>
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="disabled:opacity-50"
        >
          <IconDeviceSdCard />
          <span>
            {getIncompleteLanguages().length > 1 ||
            (getIncompleteLanguages().length > 0 &&
              getIncompleteLanguages()[0] !== selectedLanguage)
              ? translations("Fill Next Language")
              : translations("Save")}
          </span>
        </Button>
      </div>
    </div>
  );
}

export default QuestionDetailedViewFooter;
