import { useEffect, useMemo, useState } from "react";

import { Box, Flex, Group, Select, Stack } from "@mantine/core";
import { useTranslations } from "next-intl";

import { useBoardsQueries } from "@/backend/tickets/tickets.query";
import RateupLoader from "@/components/Loaders/RateupLoader";
import PremiumFeature from "@/components/Premium/PremiumFeature";
import RateupSwitch from "@/components/Switch/RateupSwitch";

import { useEditSurveyMutation } from "../../../backend/surveys/surveys.query";
import PaperLayout from "../../styled/Layouts/PaperLayout";
import NotificationEmailSettings from "./NotificationEmailSettings";

const TicketSettings = ({ survey, surveyId, enabledModules }) => {
  const [enableTickets, setEnableTickets] = useState(survey?.enableTickets);
  const [ticketBoardId, setTicketBoardId] = useState(survey?.ticketBoardId);
  const [ticketColumnId, setTicketColumnId] = useState(survey?.ticketColumnId);
  const [enableTicketEmailAlerts, setEnableTicketEmailAlerts] = useState(
    survey?.enableTicketEmailAlerts,
  );
  //ticket on every response
  const [enableAutoGenerateTicket, setEnableAutoGenerateTicket] = useState(
    survey?.enableAutoGenerateTicket,
  );
  const [enableTicketWaMessageAlerts, setEnableTicketWaMessageAlerts] =
    useState(survey?.enableTicketWaMessageAlerts);
  const translations = useTranslations();
  const editSurvey = useEditSurveyMutation(surveyId);

  useEffect(() => {
    setEnableTickets(survey?.enableTickets);
    setEnableTicketEmailAlerts(survey?.enableTicketEmailAlerts);
    setEnableAutoGenerateTicket(survey?.enableAutoGenerateTicket);
    setEnableTicketWaMessageAlerts(survey?.enableTicketWaMessageAlerts);
    setTicketBoardId(survey?.ticketBoardId);
    setTicketColumnId(survey?.ticketColumnId);
  }, [survey]);
  const { data: options, isPending } = useBoardsQueries(
    enabledModules.includes("tickets"),
  );
  // Transform boards for Select component
  const boards = useMemo(
    () => options?.map((board) => ({ value: board.id, label: board.title })),
    [options],
  );
  // Get columns for selected board
  const columns = useMemo(() => {
    const selectedBoard = options?.find((board) => board.id === ticketBoardId);
    return selectedBoard
      ? selectedBoard.ticketColumns.map((col) => ({
          value: col.id,
          label: col.title,
        }))
      : [];
  }, [options, ticketBoardId]);
  useEffect(() => {
    if (
      (ticketBoardId &&
        ticketColumnId &&
        survey?.ticketBoardId !== ticketBoardId) ||
      survey?.ticketColumnId !== ticketColumnId
    ) {
      editSurvey.mutate({
        ticketColumnId,
        ticketBoardId,
      });
    }
  }, [ticketBoardId, ticketColumnId]);

  if (enabledModules.includes("tickets") && isPending) return <RateupLoader />;

  return (
    <PaperLayout className="section-div">
      <Stack gap={"md"}>
        <PremiumFeature isSubscribed={enabledModules.includes("tickets")}>
          <Group>
            <RateupSwitch
              offMessage={translations("Click here to enable ticketing")}
              onMessage={translations("Click here to disable ticketing")}
              checked={enableTickets}
              onChange={() => {
                editSurvey.mutate({
                  enableTickets: !enableTickets,
                });
              }}
            />
            <Box className={"switch-heading-and-desc-container"}>
              <h3>{translations("Enable Ticketing")}</h3>
            </Box>
          </Group>
          <Group>
            <RateupSwitch
              offMessage={translations(
                "Click here to enable auto-generate Tickets on response",
              )}
              onMessage={translations(
                "Click here to disable auto-generate Tickets on response",
              )}
              checked={enableAutoGenerateTicket}
              onChange={() => {
                editSurvey.mutate({
                  enableAutoGenerateTicket: !enableAutoGenerateTicket,
                });
              }}
            />
            <Box className={"switch-heading-and-desc-container"}>
              <h3>{translations("Enable Auto-Generate Ticket")}</h3>
            </Box>
          </Group>
          {enableAutoGenerateTicket && (
            <Group w={"100%"} py={"sm"}>
              <Select
                label="Select Board"
                placeholder="Choose a board"
                value={ticketBoardId}
                data={boards}
                onChange={(boardId) => {
                  setTicketBoardId(boardId);
                }}
              />

              <Select
                label="Select Column"
                placeholder="Choose a column"
                value={ticketColumnId}
                data={columns}
                onChange={(columnId) => {
                  setTicketColumnId(columnId);
                }}
              />
            </Group>
          )}
          {/* 
          {enabledModules.includes("flow") && (
            <Group>
              <RateupSwitch
                offMessage={
                  translations("Click here to enable Ticket WhatsApp Message Alerts")                }
                onMessage={
                  translations("Click here to disable Ticket WhatsApp Message Alerts")                }
                checked={enableTicketWaMessageAlerts}
                onChange={() => {
                  editSurvey.mutate({
                    enableTicketWaMessageAlerts: !enableTicketWaMessageAlerts,
                  });
                }}
              />
              <Box className={"switch-heading-and-desc-container"}>
                <h3>{translations("Enable Ticket WhatsApp Message Alerts")}</h3>
              </Box>
            </Group>
          )}
          <Group>
            <RateupSwitch
              offMessage={
                translations("Click here to enable Ticket Email Alerts")
              }
              onMessage={
                translations("Click here to disable Ticket Email Alerts")
              }
              checked={enableTicketEmailAlerts}
              onChange={() => {
                editSurvey.mutate({
                  enableTicketEmailAlerts: !enableTicketEmailAlerts,
                });
              }}
            />
            <Box className={"switch-heading-and-desc-container"}>
              <h3>{translations("Enable Ticket Email Alerts")}</h3>
            </Box>
          </Group> */}
        </PremiumFeature>

        <PremiumFeature
          isSubscribed={enabledModules.includes("enableNotificationEmail")}
        >
          <NotificationEmailSettings surveyId={surveyId} survey={survey} />
        </PremiumFeature>
      </Stack>
    </PaperLayout>
  );
};

export default TicketSettings;
