import { useId, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { useEditSurveyMutation } from "@/backend/surveys/surveys.query";
import { Button } from "@/components/ui/button.tsx";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip.tsx";

import { updateEmailSurvey } from "./updateSettings.ts";

const NotificationEmailSettings = ({ survey, surveyId }) => {
  const uid = useId();
  const [enableNotificationEmail, setEnabledNotificationEmail] = useState(
    survey?.enableNotificationEmail,
  );
  const [notificationEmail, setNotificationEmail] = useState(survey?.notificationEmail);
  const [error, setError] = useState("");
  const { t: translations } = useTranslation();
  const editSurvey = useEditSurveyMutation(surveyId);

  useEffect(() => {
    if (!/^\S+@\S+$/.test(notificationEmail)) setError(translations("Invalid Email"));
    else setError("");
  }, [notificationEmail]);

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-0.5">
          <Tooltip>
            <TooltipTrigger render={<span className="inline-flex shrink-0" />}>
              <Switch
                checked={!!enableNotificationEmail}
                onCheckedChange={() => updateEmailSurvey(setEnabledNotificationEmail, editSurvey)}
              />
            </TooltipTrigger>
            <TooltipContent>
              {enableNotificationEmail
                ? translations("Click here to disable email notification")
                : translations("Click here to enable email notification")}
            </TooltipContent>
          </Tooltip>
          <span className="text-sm font-medium">{translations("Enable Email Notification")}</span>
        </div>

        <div className="flex flex-col gap-4">
          <FieldGroup>
            <Field data-invalid={!!error}>
              <FieldLabel htmlFor={`${uid}-field`}>
                {translations("Notification Email")} <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                id={`${uid}-field`}
                type="email"
                disabled={!enableNotificationEmail}
                value={notificationEmail ?? ""}
                onChange={(e) => setNotificationEmail(e.target.value)}
                placeholder={translations("Enter email ID")}
                aria-invalid={!!error}
              />
              {error && <FieldDescription className="text-destructive">{error}</FieldDescription>}
            </Field>
          </FieldGroup>

          {!survey?.notificationEmail?.length && (
            <p className="text-sm text-muted-foreground">
              {translations("Please Enter Email ID and Save to complete the process.")}
            </p>
          )}

          <div className="flex justify-center">
            <Button
              disabled={!!error || !enableNotificationEmail || editSurvey.isPending}
              onClick={() => editSurvey.mutate({ enableNotificationEmail, notificationEmail })}
            >
              {survey?.notificationEmail?.length
                ? translations("Edit Email ID")
                : translations("Save Email ID")}
            </Button>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default NotificationEmailSettings;
