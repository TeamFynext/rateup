import { IconBrandGoogleDrive } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  useDeleteIntegrationMutation,
  useGetGoogleSheetAuthorizationUrl,
  useIntegrationByType,
} from "@/backend/appsIntegration/integration.query";
import { useConfirm } from "@/context/confirm-provider.tsx";
import { IntegratedApps } from "@/types/enums.ts";

import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

export function GoogleSheet() {
  const confirm = useConfirm();

  const { data: googleAccessToken } = useIntegrationByType(IntegratedApps.googlesheet);

  const deleteAccount = useDeleteIntegrationMutation(IntegratedApps.googlesheet);
  const { t: translations } = useTranslation();
  const { data: authUrl } = useGetGoogleSheetAuthorizationUrl();
  const [, setCallBackRoute] = useState<string>(() => {
    try {
      return (
        localStorage.getItem("google-callback-route") ?? "/dashboard/apps&services/googlesheet"
      );
    } catch {
      return "/dashboard/apps&services/googlesheet";
    }
  });
  const persistCallbackRoute = (value: string) => {
    setCallBackRoute(value);
    try {
      localStorage.setItem("google-callback-route", value);
    } catch {}
  };

  const handleSignOutGoogleSync = async () => {
    const shouldSignOut = await confirm({
      title: translations("Sign out"),
      description: translations("Are you sure you want to sign out from the synced account?"),
      confirmText: translations("Yes"),
    });

    if (!shouldSignOut) return;

    toast.loading(translations("Hold on, Signing out from google sheet.."), {
      id: "integration-delete",
    });
    deleteAccount.mutate();
  };
  if (!googleAccessToken)
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center justify-center gap-4">
          <img src={"../../images/googlesheeticon.png"} className="h-25 w-20" />
          <Button
            onClick={() => {
              persistCallbackRoute("/dashboard/apps&services/googlesheet");
              window.open(authUrl);
            }}
            size="lg"
          >
            <IconBrandGoogleDrive />
            {translations("Sync Google Account")}
          </Button>
        </div>
      </div>
    );
  return (
    <div className="flex flex-col gap-4 p-8">
      <h3 className="text-xl font-semibold">{translations("Google Sheet Config")}</h3>
      <Card>
        <CardContent className="flex justify-between">
          {googleAccessToken?.credential?.userEmail && (
            <div className="flex w-2/5 flex-col gap-4">
              <h4 className="text-lg font-semibold">{translations("Synced account info")}</h4>
              <div>
                <Label>{translations("Email Address")}</Label>
                <Input value={googleAccessToken?.credential?.userEmail} disabled />
              </div>
            </div>
          )}
          <Button onClick={handleSignOutGoogleSync} variant="destructive">
            {translations("Sign out of google synced account")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
