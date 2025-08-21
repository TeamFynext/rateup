import { useEffect, useState } from "react";

import { ActionIcon, Input, Stack, Text, Tooltip } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { useGetWebhookClientSecret } from "@/backend/org/org.query";
import { RateupButtonBlue } from "@/components/Button/RateupButtons";
import { ApiCopyButton } from "@/components/ExternalApi/ApiAccessKey";
import {
  ContainedPasswordInput,
  ContainedTextField,
} from "@/components/input/ContainedInput/ContainedInput";
import PaperLayout from "@/components/styled/Layouts/PaperLayout";
import { isValidUrl } from "@/utils";

const WebhookSettings = ({ responseWebhookEndpoint, editSurvey }) => {
  const [endpointUrl, setEndpointUrl] = useState("");
  const [error, setError] = useState("");
  const { data: webhookSecret } = useGetWebhookClientSecret(
    responseWebhookEndpoint,
  );
  const translations = useTranslations();
  useEffect(() => {
    setEndpointUrl(responseWebhookEndpoint ?? "");
  }, [responseWebhookEndpoint]);

  const handleSave = () => {
    if (
      !responseWebhookEndpoint &&
      (!endpointUrl || !endpointUrl.trim().length)
    )
      return;
    if (!(responseWebhookEndpoint && !endpointUrl.trim().length)) {
      if (!isValidUrl(endpointUrl)) {
        setError(
          translations("Invalid Url, eg: https://example.com/your-endpoint"),
        );
        return;
      }
    }
    setError("");
    editSurvey.mutate({ responseWebhookEndpoint: endpointUrl });
  };

  return (
    <PaperLayout className="section-div">
      <Stack>
        <h2 className={"settings-section-heading"}>
          {translations("Webhooks")}
        </h2>
        {responseWebhookEndpoint && (
          <ContainedPasswordInput
            value={webhookSecret}
            readOnly
            rightSection={<ApiCopyButton value={webhookSecret} />}
            label={translations("Client Secret")}
          />
        )}
        <Input.Wrapper>
          <Input.Label>
            <Text size="xs">
              {translations("Enter webhook url endpoint for response")}
              <Tooltip
                label={translations("Triggers when a response is submitted")}
              >
                <IconInfoCircle size={"1rem"} />
              </Tooltip>
            </Text>
          </Input.Label>
          <ContainedTextField
            value={endpointUrl}
            type="url"
            placeholder={translations("https://example.com/webhook")}
            onChange={(e) => {
              setError("");
              setEndpointUrl(e.currentTarget.value);
            }}
            error={error}
          />
        </Input.Wrapper>

        <RateupButtonBlue
          title={translations("Save Changes")}
          onClick={handleSave}
          w={"fit-content"}
          sx={{ alignSelf: "center" }}
          loading={editSurvey.isPending}
        />
      </Stack>
    </PaperLayout>
  );
};

export default WebhookSettings;
