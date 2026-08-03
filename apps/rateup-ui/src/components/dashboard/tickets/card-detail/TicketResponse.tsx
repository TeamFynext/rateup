// Extracted verbatim from `CardDetailPage.tsx`. Behaviour is unchanged.

import { IconUser } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { getCellData } from "@/components/Survey/Response/WaResponses.tsx";
import SurveyResponsesView from "@/components/Tickets/SingleTicket/SurveyResponsesView.tsx";
import type { Card } from "@/components/Tickets/types.ts";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { markdownToPlainText } from "@/components/whatsapp/flow-v2/FlowScreensList/ScreenListItem.tsx";
import { TicketType } from "@/utils/enums/ticket.ts";

import type { FlowQuestionSummary } from "./shared.tsx";

export function TicketResponse({
  surveyResponse,
  questions,
  type,
}: Readonly<{
  surveyResponse: Card["surveyResponse"];
  questions?: FlowQuestionSummary[];
  type?: Card["type"];
}>) {
  return (
    <ScrollArea className="max-h-[80vh] p-2 mt-4">
      <div className="flex flex-col gap-4">
        {type === TicketType.SURVEY_RESPONSE ? (
          <div className="flex flex-col gap-4">
            {surveyResponse?.responses?.map((response: QuestionResponse, index: number) => {
              const question = surveyResponse?.surveyTeamMap?.survey?.questions?.find(
                (q) => q.id === response.questionId,
              );
              if (!question) return null;
              return (
                <SurveyResponsesView
                  response={response}
                  question={question}
                  type={response.type}
                  no={index + 1}
                  language={surveyResponse?.language}
                  key={index}
                />
              );
            })}
          </div>
        ) : (
          questions?.map((question: FlowQuestionSummary, index: number) => (
            <div key={question.id} className="flex flex-col gap-2 mb-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{index + 1}</Badge>
                <span className="text-sm font-medium">
                  {markdownToPlainText(question.header || question.label || "")}
                </span>
              </div>
              <div className="text-sm bg-muted/40 p-2 rounded-md">
                {getCellData(
                  surveyResponse?.responses?.find(
                    (res: QuestionResponse) => res.questionId === question.id,
                  )?.response,
                  question,
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </ScrollArea>
  );
}

export function TicketAutomationResponse({
  response,
}: Readonly<{ response: Card["waAutomatedReplyMessage"] }>) {
  const { t } = useTranslation();
  return (
    <ScrollArea className="max-h-[80vh] p-2 mt-4">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between border-b pb-2">
          <h4 className="text-sm font-bold">{t("Automation Details")}</h4>
          <Badge variant="secondary">
            {response?.waAutomatedReply?.name || "Unnamed Automation"}
          </Badge>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <IconUser className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="flex flex-col">
              <span className="text-sm font-semibold">{response?.contact?.name}</span>
              <span className="text-xs text-muted-foreground">{response?.contact?.phone}</span>
            </div>
          </div>
          <div className="bg-muted/40 p-3 rounded-lg border text-sm mt-2 whitespace-pre-wrap">
            {/* NOTE: the row has no `content` column — the answer is `response.value`
                — so this block has always rendered empty. */}
            {response?.response?.value}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
