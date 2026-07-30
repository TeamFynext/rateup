import { ArrowLeft, Info, Sparkles } from "lucide-react";
import { useContext, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useGenerateLargeTextResponseSummaryByAI } from "@/backend/surveys/response/response.query";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip.tsx";
import type { FormElement } from "@/components/whatsapp/flow-v2/utils/store.ts";
import SelectedLanguageContext from "@/context/SelectedLanguage.ts";
import SurveyContext from "@/context/SurveyContext.ts";

import { getReplacedTitleFromVariable } from "../TakeSurvey/TakeSurveyComponent/util.tsx";

import styles from "@/components/Graph/graph.module.css";

interface LargeTextResponseSummaryProp {
  surveyId: string;
  questions: Question[] | FormElement[];
  subscription: Subscription;
  currentSummary: ResponseSummary[];
  version?: number;
}

enum ResponseSummaryType {
  All = "all",
  Team = "team",
}

const LargeTextResponseSummary = ({
  surveyId,
  questions,
  subscription,
  currentSummary,
  version = 1,
}: LargeTextResponseSummaryProp) => {
  const getSummary = useGenerateLargeTextResponseSummaryByAI(surveyId);
  const { defaultLanguage } = useContext(SelectedLanguageContext);
  const [summaryTab, setSummaryTab] = useState(ResponseSummaryType.All);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | FormElement | null>(null);
  const { teams } = useContext(SurveyContext);
  const ref = useRef<HTMLDivElement | null>(null);
  const [height, setHeight] = useState(null);
  const { t: translations } = useTranslation();

  const getResponseSummary = (questionId: string, teamId?: string) => {
    if (getSummary.isPending) return;
    toast.loading("loading", { id: "summary" });
    getSummary.mutate(
      { surveyId, data: { type: summaryTab, questionId, teamId: teamId ?? undefined } },
      {
        onSuccess: () => {
          toast.success(translations("Summary generated successfully"), { id: "summary" });
        },
        onError(error) {
          console.log(error);
          toast.error(error?.message || ` ${translations("Summary generation failed:")}`, {
            id: "summary",
          });
        },
      },
    );
  };

  useEffect(() => {
    if (ref.current) setHeight(ref.current.clientHeight);
  }, [ref]);

  if (!questions?.length || !subscription.features?.ai?.active) return null;

  const LargeTextTeamwiseSummary = () => {
    if (!selectedQuestion) setSummaryTab(ResponseSummaryType.Team);
    const questionSummary = currentSummary.find((q) => q.questionId === selectedQuestion.id);
    const teamWiseSummary = questionSummary?.team;

    return (
      <div style={{ minHeight: height ?? "50vh" }} className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => setSummaryTab(ResponseSummaryType.All)}
          >
            <ArrowLeft className="size-4" />
          </Button>
          <span className="font-bold text-muted-foreground">{translations("Back")}</span>
        </div>

        <div className="flex flex-col gap-4 px-4">
          <p className="font-semibold">
            {version === 1
              ? getReplacedTitleFromVariable({
                  title:
                    selectedQuestion && "title" in selectedQuestion
                      ? selectedQuestion.title[defaultLanguage]
                      : undefined,
                  surveyId,
                })
              : selectedQuestion?.label}
          </p>

          <TooltipProvider>
            {teams?.map((team, index) => {
              const currentTeamSummary = teamWiseSummary?.find((t) => t.teamId === team.value);
              return (
                <div key={team.value} className="flex flex-col gap-3 pl-4 mt-2">
                  <div className="flex items-center justify-end gap-2">
                    <Badge variant="secondary">{team.label}</Badge>
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            size="sm"
                            onClick={() => getResponseSummary(selectedQuestion.id, team.value)}
                          >
                            <Sparkles
                              className={`mr-1.5 size-4 ${getSummary.isPending ? styles.rotateInfinitely : ""}`}
                            />
                            {translations("Generate")}
                          </Button>
                        }
                      />
                      <TooltipContent>
                        {`${translations("Generate")} ${team.label} ${translations("Summary by AI")}`}
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger
                        render={<Info className="size-4 text-muted-foreground cursor-help" />}
                      />
                      <TooltipContent className="max-w-64">
                        {translations(
                          "Summary will updated only if there are responses after summary generation",
                        )}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-semibold text-sm">Summary:</span>
                    <span className="font-semibold text-sm text-muted-foreground">
                      {currentTeamSummary?.summary ?? "---------"}
                    </span>
                  </div>
                  {index + 1 !== teams.length && <Separator className="mt-2" />}
                </div>
              );
            })}
          </TooltipProvider>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-base font-semibold text-foreground">
        {translations("Large Text Summary")}
      </h3>
      <Card>
        <CardContent className="pt-5">
          <TooltipProvider>
            {summaryTab === ResponseSummaryType.Team ? (
              <LargeTextTeamwiseSummary />
            ) : (
              <div className="flex flex-col gap-4">
                {questions?.map((question, index) => {
                  const summary = currentSummary.find(
                    (summary) => summary.questionId === question.id,
                  );
                  return (
                    <div key={question?.id} ref={ref} className="flex flex-col gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-sm">{index + 1}.</span>
                        <span className="font-semibold text-sm flex-1">
                          {version === 1
                            ? getReplacedTitleFromVariable({
                                title:
                                  "title" in question
                                    ? question.title?.[defaultLanguage]
                                    : undefined,
                                surveyId,
                              })
                            : question?.label}
                        </span>
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <Button size="sm" onClick={() => getResponseSummary(question.id)}>
                                <Sparkles
                                  className={`mr-1.5 size-4 ${getSummary.isPending ? styles.rotateInfinitely : ""}`}
                                />
                                {translations("Generate")}
                              </Button>
                            }
                          />
                          <TooltipContent>{translations("Generate Summary by AI")}</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger
                            render={<Info className="size-4 text-muted-foreground cursor-help" />}
                          />
                          <TooltipContent className="max-w-64">
                            {translations(
                              "Summary will updated only if there are responses after summary generation",
                            )}
                          </TooltipContent>
                        </Tooltip>
                      </div>

                      {summary && (
                        <div className="flex flex-col gap-2 pl-5">
                          <div className="flex gap-2">
                            <span className="font-semibold text-sm">Summary:</span>
                            <span className="font-semibold text-sm text-muted-foreground">
                              {summary.all.summary}
                            </span>
                          </div>
                          <Button
                            variant="outline"
                            className="w-fit"
                            onClick={() => {
                              setSelectedQuestion(question);
                              setSummaryTab(ResponseSummaryType.Team);
                            }}
                          >
                            {translations("Generate Team wise summary")}
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </TooltipProvider>
        </CardContent>
      </Card>
    </div>
  );
};

export default LargeTextResponseSummary;
