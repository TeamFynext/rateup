import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { useUpdateSurveyPwdMutation } from "@/backend/surveys/surveys.query";
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

import { updatePwdSurvey } from "../updateSettings.ts";

const PasswordSettings = ({ survey, surveyId }) => {
  const [password, setPassword] = useState("");
  const [passwordProtection, setPasswordProtection] = useState(survey?.isProtected);
  const [isPasswordInputInvalid, setIsPasswordInputInvalid] = useState<boolean | string>(false);
  const { t: translations } = useTranslation();
  const updateSurveyPassword = useUpdateSurveyPwdMutation(surveyId);

  useEffect(() => {
    setPassword(survey?.password?.length ? survey.password : "");
  }, [survey]);

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
    updateSurveyPassword.mutate({ surveyId, password });
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
            <FieldLabel>
              {translations("Password")} <span className="text-destructive">*</span>
            </FieldLabel>
            <Input
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
            {survey?.password?.length
              ? translations("Edit Password")
              : translations("Save Password")}
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default PasswordSettings;
