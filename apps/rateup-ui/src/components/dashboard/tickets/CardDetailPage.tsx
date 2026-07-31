// Extracted verbatim from the `/dashboard/tickets/$ticketId/` route so the route file carries routing
// config only. Behaviour is unchanged.

import { useParams, useRouter } from "@tanstack/react-router";
import { FileText, History, MessageSquare } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { useCardById } from "@/backend/tickets/tickets.query";
import RateupLoader from "@/components/Loaders/RateupLoader.tsx";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QuestionType2 } from "@/types/enums.ts";

import { EditTicket } from "./card-detail/EditTicket.tsx";
import { RightSidebar } from "./card-detail/RightSidebar.tsx";
import type { FlowLayoutChild } from "./card-detail/shared.tsx";
import { TicketActivity } from "./card-detail/TicketActivity.tsx";
import { TicketComments } from "./card-detail/TicketComments.tsx";
import { TicketAutomationResponse, TicketResponse } from "./card-detail/TicketResponse.tsx";
import { TicketTopHeader } from "./card-detail/TicketTopHeader.tsx";

export function CardDetailPage() {
  const { t } = useTranslation();
  const params = useParams({ strict: false });
  const ticketId = params?.ticketId as string;

  const { history } = useRouter();
  const { data: card, isPending, error } = useCardById(ticketId);

  const questions = useMemo(() => {
    return card?.surveyResponse?.surveyTeamMap?.survey?.WaFlow?.json?.screens?.flatMap((screen) =>
      (screen.layout.children as FlowLayoutChild[])
        .filter((child) => child.type !== QuestionType2.Footer)
        .map(({ id, label, metaType, name, "data-source": dataSource, header }) => ({
          id: id ?? "",
          label,
          metaType,
          // The element's data source is either the choice list or a screen
          // reference; only the list is a question's options.
          dataSource: Array.isArray(dataSource) ? dataSource : undefined,
          name,
          header,
        }))
        .filter(({ name }) => name),
    );
  }, [card]);

  if (isPending) return <RateupLoader aria-label={t("Loading ticket...")} />;
  if (error)
    return (
      <div className="p-4 text-red-500">
        {t("Error loading ticket")}: {error.message}
      </div>
    );
  if (!card) return <div className="p-4">{t("Ticket not found")}</div>;

  return (
    <Dialog
      open={true}
      onOpenChange={(open) => {
        if (!open) history.back();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="max-w-[100vw] md:max-w-[75vw] w-full md:min-w-2xl lg:min-w-4xl xl:min-w-6xl h-screen md:h-[95vh] p-0 overflow-hidden flex flex-col bg-background gap-0 border-none shadow-[0_32px_80px_rgba(11,31,72,.26)] rounded-none md:rounded-[20px]"
      >
        <DialogTitle className="sr-only">{t("Ticket Details")}</DialogTitle>
        <DialogDescription className="sr-only">
          {t("View and edit ticket details.")}
        </DialogDescription>

        <TicketTopHeader ticket={card} ticketId={ticketId} onClose={() => history.back()} />

        <div className="flex flex-col md:flex-row flex-1 overflow-y-auto md:overflow-hidden min-h-0 bg-background">
          <div className="w-full md:w-72 shrink-0 bg-slate-50 dark:bg-muted/20 md:overflow-y-auto md:order-2 border-b md:border-b-0 md:border-l border-border">
            <div className="p-4 md:p-5 bg-ink-25 dark:bg-muted/20 ">
              <RightSidebar ticket={card} ticketId={ticketId} onClose={() => history.back()} />
            </div>
          </div>
          {/* Main Left Content */}
          <div className="flex-1 flex flex-col overflow-y-auto md:overflow-y-auto md:border-r border-border md:order-1 min-h-0">
            {/* Top area - description, checklists, etc. */}
            <div className="p-4 md:p-[22px_24px] md:pb-0 shrink-0">
              <EditTicket ticket={card} ticketId={ticketId} />
            </div>

            {/* Bottom - Tabs */}
            <div className="flex-1 p-4 md:p-[22px_24px] md:pt-4">
              <Tabs defaultValue="comments" className="w-full">
                <TabsList className="shrink-0 justify-start h-auto flex-wrap bg-transparent p-0 rounded-none gap-0">
                  <TabsTrigger
                    value="comments"
                    className="group gap-1.5 md:gap-2 text-xs md:text-[13px] font-semibold text-muted-foreground data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none! shadow-none rounded-none px-3 pb-2.5 pt-2 border-b-2 border-transparent data-[state=active]:border-b-primary transition-all"
                  >
                    <MessageSquare className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    {t("Comments")}
                    {(card.ticketComments?.length || 0) > 0 && (
                      <span className="rounded-full px-1.5 py-0.5 text-[10px] font-bold bg-muted text-muted-foreground group-data-[state=active]:bg-primary/10 group-data-[state=active]:text-primary">
                        {card.ticketComments?.length}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger
                    value="activity"
                    className="group gap-1.5 md:gap-2 text-xs md:text-[13px] font-semibold text-muted-foreground data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none! shadow-none rounded-none px-3 pb-2.5 pt-2 border-b-2 border-transparent data-[state=active]:border-b-primary transition-all"
                  >
                    <History className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    {t("Activity")}
                    {(card.ticketActivities?.length || 0) > 0 && (
                      <span className="rounded-full px-1.5 py-0.5 text-[10px] font-bold bg-muted text-muted-foreground group-data-[state=active]:bg-primary/10 group-data-[state=active]:text-primary">
                        {card.ticketActivities?.length}
                      </span>
                    )}
                  </TabsTrigger>
                  {card.surveyResponseId && (
                    <TabsTrigger
                      value="response"
                      className="group gap-1.5 md:gap-2 text-xs md:text-[13px] font-semibold text-muted-foreground data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none! shadow-none rounded-none px-1 pb-2.5 pt-2 border-b-2 border-transparent data-[state=active]:border-b-primary transition-all"
                    >
                      <FileText className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      {t("Response Details")}
                    </TabsTrigger>
                  )}
                  {card.waAutomatedReplyMessageId && (
                    <TabsTrigger
                      value="automation"
                      className="group gap-1.5 md:gap-2 text-xs md:text-[13px] font-semibold text-muted-foreground data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none! shadow-none rounded-none px-1 pb-2.5 pt-2 border-b-2 border-transparent data-[state=active]:border-b-primary transition-all"
                    >
                      <MessageSquare className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      {t("Automation")}
                    </TabsTrigger>
                  )}
                </TabsList>

                <div className="pr-1 md:pr-2">
                  <TabsContent value="activity" className="mt-0">
                    <TicketActivity activities={card?.ticketActivities || []} />
                  </TabsContent>

                  <TabsContent value="comments" className="mt-0">
                    <TicketComments data={card?.ticketComments || []} ticketCardId={ticketId} />
                  </TabsContent>

                  {card.surveyResponseId && (
                    <TabsContent value="response" className="mt-0">
                      <TicketResponse
                        surveyResponse={card.surveyResponse}
                        questions={questions}
                        type={card.type}
                      />
                    </TabsContent>
                  )}

                  {card.waAutomatedReplyMessageId && (
                    <TabsContent value="automation" className="mt-0">
                      <TicketAutomationResponse response={card.waAutomatedReplyMessage} />
                    </TabsContent>
                  )}
                </div>
              </Tabs>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
