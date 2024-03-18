import { Stack, Group, Switch } from "@mantine/core";
import PaperLayout from "../../styled/Layouts/PaperLayout";
import { useEffect, useState } from "react";
import { useEditSurveyMutation } from "../../../backend/surveys/surveys.query";

const TicketSettings = ({ survey, surveyId }) => {
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
    <PaperLayout shadow="xl" p={"xl"}>
      <Stack gap={"md"}>
        <Group justify="space-between">
          <Switch
            label={"Enable Ticketing"}
            size="md"
            checked={enableTickets}
            onChange={() => {
              editSurvey.mutate({
                enableTickets: !enableTickets,
              });
            }}
          />
        </Group>
        <Group justify="space-between">
          <Switch
            label={"Enable Ticket Email Alerts"}
            size="md"
            checked={enableTicketEmailAlerts}
            onChange={() => {
              editSurvey.mutate({
                enableTicketEmailAlerts: !enableTicketEmailAlerts,
              });
            }}
          />
        </Group>
      </Stack>
    </PaperLayout>
  );
};

export default TicketSettings;
