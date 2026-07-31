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
            <IconAlertTriangle className="text-red-500" size={18} />
            {t("Session Error")}
          </CardTitle>
          <CardDescription>{t("Your login session data appears to be corrupted")}.</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTitle>{t("Unable to load user data")}</AlertTitle>
            <AlertDescription>
              {t(
                "Please retry loading the application. If the problem continues, you may need to logout and login again",
              )}
              .
            </AlertDescription>
          </Alert>
        </CardContent>

        <CardFooter className="grid grid-cols-2 gap-3">
          <Button className="w-full" onClick={handleRetry}>
            {t("Reload")}
          </Button>

          <Button variant="destructive" className="w-full" onClick={handleLogout}>
            {t("Logout")}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
