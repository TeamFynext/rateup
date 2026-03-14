"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function CorruptedSessionScreen() {
  const router = useRouter();
  const t = useTranslations();

  const handleRetry = () => {
    localStorage.removeItem("userInfo");
    window.location.reload();
  };

  const handleLogout = () => {
    router.push("/logout");
  };

  return (
    <div className="flex h-screen items-center justify-center bg-muted/40 px-4">
      <Card className="w-[420px]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="text-red-500" size={18} />
            {t("Session Error")}
          </CardTitle>
          <CardDescription>
            {t("Your login session data appears to be corrupted")}.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTitle>{t("Unable to load user data")}</AlertTitle>
            <AlertDescription>
              {t(
                "Please retry loading the application, if the problem continues, you may need to logout and login again",
              )}
              .
            </AlertDescription>
          </Alert>
        </CardContent>

        <CardFooter className="grid grid-cols-2 gap-3">
          <Button className="w-full" onClick={handleRetry}>
            {t("Reload")}
          </Button>

          <Button
            variant="destructive"
            className="w-full"
            onClick={handleLogout}
          >
            {t("Logout")}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
