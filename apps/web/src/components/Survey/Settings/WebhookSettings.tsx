import { Button } from "@rateup/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@rateup/ui/components/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@rateup/ui/components/field";
import { Input } from "@rateup/ui/components/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@rateup/ui/components/input-group";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@rateup/ui/components/tooltip";
import { IconInfoCircle, IconWebhook } from "@tabler/icons-react";
import { useId, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { useGetWebhookClientSecret } from "@/backend/org/org.query";
import { ApiCopyButton } from "@/components/ExternalApi/ApiCopyButton.tsx";
import PremiumFeature from "@/components/Premium/PremiumFeature.tsx";
import type { SurveyUpdateMutation } from "@/components/Survey/Settings/updateSettings.ts";
import { isValidUrl } from "@/utils/index.ts";

const WebhookSettings = ({
  responseWebhookEndpoint,
  editSurvey,
  enabledModules,
}: {
  responseWebhookEndpoint: string | undefined;
  editSurvey: SurveyUpdateMutation;
  enabledModules: string[];
}) => {
  const uid = useId();
  const [endpointUrl, setEndpointUrl] = useState("");
  const [error, setError] = useState("");
  const { data: webhookSecret } = useGetWebhookClientSecret(responseWebhookEndpoint);
  const { t: translations } = useTranslation();

  useEffect(() => {
    setEndpointUrl(responseWebhookEndpoint ?? "");
  }, [responseWebhookEndpoint]);

  const handleSave = () => {
    if (!responseWebhookEndpoint && (!endpointUrl || !endpointUrl.trim().length)) return;
    if (!(responseWebhookEndpoint && !endpointUrl.trim().length)) {
      if (!isValidUrl(endpointUrl)) {
        setError(translations("Invalid Url, eg: https://example.com/your-endpoint"));
        return;
      }
    }
    setError("");
    editSurvey.mutate({ responseWebhookEndpoint: endpointUrl });
  };

  return (
    <TooltipProvider>
      <Card>
        <CardHeader className="flex flex-row items-center gap-2.25">
          <IconWebhook className="size-4 text-primary" />
          <CardTitle className="font-display text-[15px] font-extrabold">
            {translations("Webhooks")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PremiumFeature isSubscribed={enabledModules.includes("webhook")}>
            <div className="flex flex-col gap-4">
              <FieldGroup>
                {responseWebhookEndpoint && (
                  <Field>
                    <FieldLabel htmlFor={`${uid}-field`}>
                      {translations("Client Secret")}
                    </FieldLabel>
                    <InputGroup>
                      <InputGroupInput
                        id={`${uid}-field`}
                        type="password"
                        readOnly
                        value={webhookSecret ?? ""}
                      />
                      <InputGroupAddon align="inline-end">
                        <ApiCopyButton value={webhookSecret ?? ""} />
                      </InputGroupAddon>
                    </InputGroup>
                  </Field>
                )}

                <Field data-invalid={!!error}>
                  <FieldLabel htmlFor={`${uid}-field-2`}>
                    <span className="flex items-center gap-1">
                      {translations("Enter webhook url endpoint for response")}
                      <Tooltip>
                        <TooltipTrigger render={<span className="inline-flex" />}>
                          <IconInfoCircle className="size-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          {translations("Triggers when a response is submitted")}
                        </TooltipContent>
                      </Tooltip>
                    </span>
                  </FieldLabel>
                  <Input
                    id={`${uid}-field-2`}
                    type="url"
                    value={endpointUrl}
                    placeholder={translations("https://example.com/webhook")}
                    aria-invalid={!!error}
                    onChange={(e) => {
                      setError("");
                      setEndpointUrl(e.currentTarget.value);
                    }}
                  />
                  {error && (
                    <FieldDescription className="text-destructive">{error}</FieldDescription>
                  )}
                </Field>
              </FieldGroup>

              <div className="flex justify-end">
                <Button size="sm" onClick={handleSave} loading={editSurvey.isPending}>
                  {translations("Save Changes")}
                </Button>
              </div>
            </div>
          </PremiumFeature>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};

export default WebhookSettings;
