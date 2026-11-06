import { IconAlertTriangle } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";

export default function CorruptedSessionScreen() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleRetry = () => {
    localStorage.removeItem("userInfo");
    window.location.reload();
  };

  const handleLogout = () => {
    navigate({
      to: "/logout",
    });
  };

  return (
    <div className="flex h-screen items-center justify-center bg-muted/40 px-4">
      <Card className="w-[420px]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconAlertTriangle className="text-amber-500" size={18} />
            {t("Couldn't load your account")}
          </CardTitle>
          <CardDescription>
            {t("This is usually a connection problem, or your session may have expired")}.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <Alert>
            <AlertTitle>{t("Check your internet connection")}</AlertTitle>
            <AlertDescription>
              {t(
                "Make sure you are online, then reload. If it keeps happening, log out and log back in to refresh your session",
              )}
              .
            </AlertDescription>
          </Alert>
        </CardContent>

        <CardFooter className="grid grid-cols-2 gap-3">
          <Button className="w-full" onClick={handleRetry}>
            {t("Reload")}
          </Button>

          <Button variant="outline" className="w-full" onClick={handleLogout}>
            {t("Logout")}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
