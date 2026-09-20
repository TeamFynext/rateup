import { IconKey } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useAllResponses } from "@/backend/surveys/response/response.query";
import { useEditSurveyMutation } from "@/backend/surveys/surveys.query";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip.tsx";
import { useConfirm } from "@/context/confirm-provider.tsx";
import { useUser } from "@/context/UserContext.tsx";
import { cn } from "@/lib/utils.ts";

import { updateEndToEndEncryption } from "../updateSettings.ts";

interface ETESettingsInterface {
  survey: Survey;
}

export default function ETESettings({ survey }: ETESettingsInterface) {
  const { user } = useUser();
  const navigate = useNavigate();
  const [endtoendencryption, setEndToEndEncryption] = useState(survey?.isEncrypted);
  const { t: translations } = useTranslation();
  const confirm = useConfirm();
  const editSurvey = useEditSurveyMutation(survey?.id);
  const { data: responses } = useAllResponses(survey?.id);

  const hasResponses = responses?.map((r) => r?.responses?.length).some((v) => (v ?? 0) > 0);

  const isDisabled = (!!endtoendencryption && !!user?.encryptionKeys) || !!hasResponses;

  async function onSwitched(checked: boolean) {
    if (!checked) return;
    if (!user?.encryptionKeys) {
      toast.error(
        translations(
          "You need to generate encryptionKeys first , head on to settings to generate your keys",
        ),
      );
      return;
    }
    const shouldEnable = await confirm({
      title: translations("End-to-End Encryption"),
      description: translations(
        "Are you sure you want to enable end-to-end encryption? Once enabled it cannot be disabled.",
      ),
      confirmText: translations("Confirm"),
    });
    if (!shouldEnable) return;
    updateEndToEndEncryption(setEndToEndEncryption, user?.encryptionKeys?.publicKey, editSurvey);
  }

  const switchTooltip = endtoendencryption
    ? translations("Click here to disable End-to-End Encryption")
    : translations("Click here to encrypt the response data");

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Tooltip>
              <TooltipTrigger render={<span className="inline-flex" />}>
                <Switch
                  checked={!!endtoendencryption}
                  onCheckedChange={onSwitched}
                  disabled={isDisabled}
                />
              </TooltipTrigger>
              <TooltipContent>{switchTooltip}</TooltipContent>
            </Tooltip>

            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2 text-sm font-medium">
                {translations("End-to-End Encryption")}
                <Badge
                  variant={endtoendencryption ? "secondary" : "destructive"}
                  className={cn(
                    "text-xs",
                    endtoendencryption &&
                      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                  )}
                >
                  {endtoendencryption ? "Enabled" : "Disabled"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {translations("Encrypts the response data")}
              </p>
            </div>
          </div>

          {!user?.encryptionKeys && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    aria-label={translations("Show the key")}
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => navigate({ to: "/dashboard/settings/account" })}
                  />
                }
              >
                <IconKey className="size-4" />
              </TooltipTrigger>
              <TooltipContent side="left">
                {translations(
                  "You need to generate encryptionKeys first , head on to settings to generate your keys",
                )}
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {hasResponses && !survey?.isEncrypted && (
          <p className="text-xs font-black text-destructive">
            {translations("Reset responses to enable end to end encryption")}
          </p>
        )}
      </div>
    </TooltipProvider>
  );
}
