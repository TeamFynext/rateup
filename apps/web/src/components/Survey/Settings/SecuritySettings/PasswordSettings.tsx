import { Button } from "@rateup/ui/components/button";
import { Input } from "@rateup/ui/components/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@rateup/ui/components/tooltip";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";

import { useUpdateSurveyPwdMutation } from "@/backend/surveys/surveys.query";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field.tsx";
import { Switch } from "@/components/ui/switch.tsx";

import { updatePwdSurvey } from "../updateSettings.ts";

const PasswordSettings = ({ survey, surveyId }: { survey: Survey; surveyId: string }) => {
  const uid = useId();
  const [password, setPassword] = useState("");
  const [passwordProtection, setPasswordProtection] = useState(survey?.isProtected);
  const [isPasswordInputInvalid, setIsPasswordInputInvalid] = useState<boolean | string>(false);
  const { t: translations } = useTranslation();
  const updateSurveyPassword = useUpdateSurveyPwdMutation(surveyId);

  const handleSwitchChange = () => {
    if (!passwordProtection) {
      setIsPasswordInputInvalid(false);
      setPassword("");
    }
    updatePwdSurvey(updateSurveyPassword, setPasswordProtection, surveyId);
  };

  const handleSave = () => {
    if (passwordProtection && password === "") {
      setIsPasswordInputInvalid(translations("Please enter a password"));
      return;
    }
    setIsPasswordInputInvalid(false);
    // The input stays empty once saved: the API keeps only a hash and never sends it back.
    updateSurveyPassword.mutate({ surveyId, password }, { onSuccess: () => setPassword("") });
  };

  const switchTooltip = passwordProtection
    ? translations("Click here to disable password protection")
    : translations("Click here to enable password protection");

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-0.5">
          <Tooltip>
            <TooltipTrigger render={<span className="inline-flex shrink-0" />}>
              <Switch checked={!!passwordProtection} onCheckedChange={handleSwitchChange} />
            </TooltipTrigger>
            <TooltipContent>{switchTooltip}</TooltipContent>
          </Tooltip>
          <span className="text-sm font-medium">{translations("Password Protection")}</span>
          <div />
          <p className="text-xs text-muted-foreground">
            {translations("Participants need to enter the password to start the survey")}
          </p>
        </div>

        <FieldGroup>
          <Field data-invalid={!!isPasswordInputInvalid}>
            <FieldLabel htmlFor={`${uid}-field`}>
              {translations("Password")} <span className="text-destructive">*</span>
            </FieldLabel>
            <Input
              id={`${uid}-field`}
              type="password"
              disabled={!passwordProtection}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={translations("Enter new password")}
              aria-invalid={!!isPasswordInputInvalid}
            />
            {isPasswordInputInvalid && (
              <FieldDescription className="text-destructive">
                {isPasswordInputInvalid as string}
              </FieldDescription>
            )}
          </Field>
        </FieldGroup>

        <div className="flex justify-center">
          <Button
            disabled={!passwordProtection || updateSurveyPassword.isPending}
            onClick={handleSave}
          >
            {survey?.hasPassword && survey.isProtected
              ? translations("Edit Password")
              : translations("Save Password")}
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default PasswordSettings;
