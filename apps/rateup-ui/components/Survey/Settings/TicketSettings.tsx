import { Stack, Group, Switch, Box } from "@mantine/core";
import PaperLayout from "../../styled/Layouts/PaperLayout";
import { useEffect, useState } from "react";
import { useEditSurveyMutation } from "../../../backend/surveys/surveys.query";
import NotificationEmailSettings from "./NotificationEmailSettings";

const TicketSettings = ({ survey, surveyId, enabledModules }) => {
  const [enableTickets, setEnableTickets] = useState(survey?.enableTickets);
  const [enableTicketEmailAlerts, setEnableTicketEmailAlerts] = useState(
    survey?.enableTicketEmailAlerts,
  );

  const editSurvey = useEditSurveyMutation(surveyId);

  useEffect(() => {
    setEnableTickets(survey?.enableTickets);
    setEnableTicketEmailAlerts(survey?.enableTicketEmailAlerts);
  }, [survey]);

  return (
    <PaperLayout className="section-div">
      <Stack gap={"md"}>
        <Group>
          <Switch
            className={`switch ${enableTickets ? "on" : "off"}`}
            size="md"
            checked={enableTickets}
            onChange={() => {
              editSurvey.mutate({
                enableTickets: !enableTickets,
              });
            }}
          />
          <Box className={"switch-heading-and-desc-container"}>
            <h3>Enable Ticketing</h3>
          </Box>
        </Group>
        <Group>
          <Switch
            className={`switch ${enableTicketEmailAlerts ? "on" : "off"}`}
            size="md"
            checked={enableTicketEmailAlerts}
            onChange={() => {
              editSurvey.mutate({
                enableTicketEmailAlerts: !enableTicketEmailAlerts,
              });
            }}
          />
          <Box className={"switch-heading-and-desc-container"}>
            <h3>Enable Ticket Email Alerts</h3>
          </Box>
        </Group>
        {enabledModules.includes("enableNotificationEmail") && (
          <NotificationEmailSettings surveyId={surveyId} survey={survey} />
        )}
      </Stack>
    </PaperLayout>
  );
};

export default TicketSettings;
