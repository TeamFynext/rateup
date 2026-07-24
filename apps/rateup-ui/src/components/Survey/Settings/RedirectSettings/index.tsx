import { IconExternalLink } from "@tabler/icons-react";
import { useId } from "react";
import { useTranslation } from "react-i18next";

type RedirectError = { url: string; time: string };

import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip.tsx";

import { updateRedirect } from "../updateSettings.ts";

function RedirectSettings({
  enabledModules,
  redirect,
  setRedirect,
  editSurvey,
  kioskMode,
  survey,
  redirectError,
  setRedirectError,
  debounced,
}) {
  const uid = useId();
  const { t: translations } = useTranslation();

  function validateUrl(url: string) {
    try {
      if (url === "/") return false;
      new URL(url);
      return false;
    } catch {
      return true;
    }
  }

  const areInputsEnabled = !survey?.kioskMode && (redirect?.enable ?? false);

  if (!enabledModules.includes("redirect")) return null;

  const switchTooltip = redirect?.enable
    ? translations("Click here to disable Redirect option")
    : translations("Click here to enable Redirect option");

  return (
    <TooltipProvider>
      <Card>
        <CardHeader className="flex flex-row items-center gap-2.25">
          <IconExternalLink className="size-4 text-primary" />
          <CardTitle className="font-nunito text-[15px] font-extrabold">
            {translations("Redirect")}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-0.5">
            <Tooltip>
              <TooltipTrigger render={<span className="inline-flex shrink-0" />}>
                <Switch
                  checked={redirect?.enable ?? false}
                  onCheckedChange={() => updateRedirect(setRedirect, editSurvey)}
                  disabled={kioskMode}
                />
              </TooltipTrigger>
              <TooltipContent>{switchTooltip}</TooltipContent>
            </Tooltip>
            <span className="text-sm font-medium">{translations("Redirect")}</span>
            <div />
            <p className="text-xs text-muted-foreground">
              {kioskMode
                ? translations("Not available since KioskMode is Enabled")
                : translations("Redirect to a specific url after the user completes the survey")}
            </p>
          </div>

          <FieldGroup>
            <div className="grid grid-cols-2 gap-3">
              <Field data-invalid={!!redirectError?.url}>
                <FieldLabel htmlFor={`${uid}-field`}>
                  {translations("Redirect Url")} <span className="text-destructive">*</span>
                </FieldLabel>
                <Input
                  id={`${uid}-field`}
                  disabled={!areInputsEnabled}
                  placeholder={translations("Target URL for redirection")}
                  defaultValue={redirect?.url}
                  aria-invalid={!!redirectError?.url}
                  onChange={(e) => {
                    const val = e.target.value.trim();
                    if (val.length === 0) {
                      return setRedirectError((prev: RedirectError) => ({
                        ...prev,
                        url: translations("Url should not be empty"),
                      }));
                    }
                    if (validateUrl(val)) {
                      return setRedirectError((prev: RedirectError) => ({
                        ...prev,
                        url: translations(
                          "Enter the Url in Correct format or / for RateUp homepage",
                        ),
                      }));
                    }
                    setRedirectError((prev: RedirectError) => ({ ...prev, url: "" }));
                    setRedirect({ ...redirect, url: e.target.value });
                  }}
                />
                {redirectError?.url && (
                  <FieldDescription className="text-destructive">
                    {redirectError.url}
                  </FieldDescription>
                )}
              </Field>

              <Field data-invalid={!!redirectError?.time}>
                <FieldLabel htmlFor={`${uid}-field-2`}>
                  {translations("Redirect After (in seconds)")}{" "}
                  <span className="text-destructive">*</span>
                </FieldLabel>
                <Input
                  id={`${uid}-field-2`}
                  type="number"
                  disabled={!areInputsEnabled}
                  placeholder={translations("time in seconds")}
                  defaultValue={redirect?.time}
                  min={2}
                  max={60}
                  aria-invalid={!!redirectError?.time}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (val < 2 || val > 60) {
                      return setRedirectError((prev: RedirectError) => ({
                        ...prev,
                        time: translations("Time must be between 2-60"),
                      }));
                    }
                    setRedirectError((prev: RedirectError) => ({ ...prev, time: "" }));
                    updateRedirect(setRedirect, editSurvey, { ...redirect, time: val });
                  }}
                />
                {redirectError?.time && (
                  <FieldDescription className="text-destructive">
                    {redirectError.time}
                  </FieldDescription>
                )}
              </Field>
            </div>
          </FieldGroup>

          <div className="flex justify-end">
            <Button
              size="sm"
              disabled={
                !!redirectError?.time?.length || !!redirectError?.url?.length || !areInputsEnabled
              }
              onClick={() => {
                if (debounced && !kioskMode && redirect?.enable) {
                  updateRedirect(setRedirect, editSurvey, { ...redirect, url: debounced });
                }
              }}
            >
              {survey?.notificationEmail?.length
                ? translations("Edit Redirect")
                : translations("Save Redirect")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

export default RedirectSettings;
