import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { useEditSurveyMutation } from "@/backend/surveys/surveys.query";
import { useBoardsQueries } from "@/backend/tickets/tickets.query";
import RateupLoader from "@/components/Loaders/RateupLoader.tsx";
import PremiumFeature from "@/components/Premium/PremiumFeature.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip.tsx";

import NotificationEmailSettings from "./NotificationEmailSettings.tsx";

const TicketSettings = ({ survey, surveyId, enabledModules }) => {
  const [enableTickets, setEnableTickets] = useState(survey?.enableTickets);
  const [ticketBoardId, setTicketBoardId] = useState(survey?.ticketBoardId);
  const [ticketColumnId, setTicketColumnId] = useState(survey?.ticketColumnId);
  const [, setEnableTicketEmailAlerts] = useState(survey?.enableTicketEmailAlerts);
  const [enableAutoGenerateTicket, setEnableAutoGenerateTicket] = useState(
    survey?.enableAutoGenerateTicket,
  );
  const [, setEnableTicketWaMessageAlerts] = useState(survey?.enableTicketWaMessageAlerts);
  const { t: translations } = useTranslation();
  const editSurvey = useEditSurveyMutation(surveyId);

  useEffect(() => {
    setEnableTickets(survey?.enableTickets);
    setEnableTicketEmailAlerts(survey?.enableTicketEmailAlerts);
    setEnableAutoGenerateTicket(survey?.enableAutoGenerateTicket);
    setEnableTicketWaMessageAlerts(survey?.enableTicketWaMessageAlerts);
    setTicketBoardId(survey?.ticketBoardId);
    setTicketColumnId(survey?.ticketColumnId);
  }, [survey]);

  const { data: options, isPending } = useBoardsQueries(enabledModules.includes("tickets"));

  const boards = useMemo(
    () => options?.map((board) => ({ value: board.id, label: board.title })),
    [options],
  );

  const columns = useMemo(() => {
    const selectedBoard = options?.find((board) => board.id === ticketBoardId);
    return selectedBoard
      ? selectedBoard.ticketColumns.map((col) => ({ value: col.id, label: col.title }))
      : [];
  }, [options, ticketBoardId]);

  useEffect(() => {
    if (
      (ticketBoardId && ticketColumnId && survey?.ticketBoardId !== ticketBoardId) ||
      survey?.ticketColumnId !== ticketColumnId
    ) {
      editSurvey.mutate({ ticketColumnId, ticketBoardId });
    }
  }, [ticketBoardId, ticketColumnId]);

  if (enabledModules.includes("tickets") && isPending) return <RateupLoader />;

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <CardTitle>{translations("Tickets")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <PremiumFeature isSubscribed={enabledModules.includes("tickets")}>
            <div className="flex flex-col gap-5">
              <div className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-0.5">
                <Tooltip>
                  <TooltipTrigger render={<span className="inline-flex shrink-0" />}>
                    <Switch
                      checked={!!enableTickets}
                      onCheckedChange={() => editSurvey.mutate({ enableTickets: !enableTickets })}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    {enableTickets
                      ? translations("Click here to disable ticketing")
                      : translations("Click here to enable ticketing")}
                  </TooltipContent>
                </Tooltip>
                <span className="text-sm font-medium">{translations("Enable Ticketing")}</span>
              </div>

              <div className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-0.5">
                <Tooltip>
                  <TooltipTrigger render={<span className="inline-flex shrink-0" />}>
                    <Switch
                      checked={!!enableAutoGenerateTicket}
                      onCheckedChange={() =>
                        editSurvey.mutate({
                          enableAutoGenerateTicket: !enableAutoGenerateTicket,
                        })
                      }
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    {enableAutoGenerateTicket
                      ? translations("Click here to disable auto-generate Tickets on response")
                      : translations("Click here to enable auto-generate Tickets on response")}
                  </TooltipContent>
                </Tooltip>
                <span className="text-sm font-medium">
                  {translations("Enable Auto-Generate Ticket")}
                </span>
              </div>

              {enableAutoGenerateTicket && (
                <FieldGroup>
                  <div className="grid grid-cols-2 gap-3">
                    <Field>
                      <FieldLabel>{translations("Select Board")}</FieldLabel>
                      <Select
                        value={ticketBoardId ?? ""}
                        onValueChange={(v) => setTicketBoardId(v)}
                        items={boards ?? []}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={translations("Choose a board")} />
                        </SelectTrigger>
                        <SelectContent>
                          {boards?.map((b) => (
                            <SelectItem key={b.value} value={b.value}>
                              {b.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>

                    <Field>
                      <FieldLabel>{translations("Select Column")}</FieldLabel>
                      <Select
                        value={ticketColumnId ?? ""}
                        onValueChange={(v) => setTicketColumnId(v)}
                        items={columns}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={translations("Choose a column")} />
                        </SelectTrigger>
                        <SelectContent>
                          {columns.map((c) => (
                            <SelectItem key={c.value} value={c.value}>
                              {c.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                </FieldGroup>
              )}
            </div>
          </PremiumFeature>

          <PremiumFeature isSubscribed={enabledModules.includes("enableNotificationEmail")}>
            <NotificationEmailSettings surveyId={surveyId} survey={survey} />
          </PremiumFeature>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};

export default TicketSettings;
