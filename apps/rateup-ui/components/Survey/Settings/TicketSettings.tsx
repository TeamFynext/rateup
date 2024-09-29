import { useEffect, useState } from "react";

import { Box, Group, Stack, Switch } from "@mantine/core";

import PremiumFeature from "@/components/Premium/PremiumFeature";
import useTranslations from "@/dictionaries/useTranslation";

import { useEditSurveyMutation } from "../../../backend/surveys/surveys.query";
import PaperLayout from "../../styled/Layouts/PaperLayout";
import NotificationEmailSettings from "./NotificationEmailSettings";

const TicketSettings = ({ survey, surveyId, enabledModules }) => {
  const [enableTickets, setEnableTickets] = useState(survey?.enableTickets);
  const [enableTicketEmailAlerts, setEnableTicketEmailAlerts] = useState(
    survey?.enableTicketEmailAlerts,
  );
  const { translations } = useTranslations();
  const editSurvey = useEditSurveyMutation(surveyId);

  useEffect(() => {
    setEnableTickets(survey?.enableTickets);
    setEnableTicketEmailAlerts(survey?.enableTicketEmailAlerts);
  }, [survey]);

  return (
    <PaperLayout className="section-div">
      <Stack gap={"md"}>
        <PremiumFeature isSubscribed={enabledModules.includes("tickets")}>
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
              <h3>{translations["Enable Ticketing"]}</h3>
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
              <h3>{translations["Enable Ticket Email Alerts"]}</h3>
            </Box>
          </Group>
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
