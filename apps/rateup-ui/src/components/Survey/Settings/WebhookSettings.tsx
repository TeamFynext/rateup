import { IconInfoCircle, IconWebhook } from "@tabler/icons-react";
import { useId, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { useGetWebhookClientSecret } from "@/backend/org/org.query";
import { ApiCopyButton } from "@/components/ExternalApi/ApiAccessKey.tsx";
import PremiumFeature from "@/components/Premium/PremiumFeature.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field.tsx";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip.tsx";
import { isValidUrl } from "@/utils/index.ts";

const WebhookSettings = ({ responseWebhookEndpoint, editSurvey, enabledModules }) => {
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
          <CardTitle className="font-nunito text-[15px] font-extrabold">
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
                <Button size="sm" onClick={handleSave} disabled={editSurvey.isPending}>
                  {editSurvey.isPending && <Spinner data-icon="inline-start" />}
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
