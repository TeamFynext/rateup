import { IconInfoCircle } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";

export function InfoMessage() {
  const { t: translations } = useTranslation();
  return (
    <Alert className="border-blue-700 bg-ru-blue-50 [&>svg]:text-blue-700 dark:border-blue-500 dark:bg-blue-950/40 dark:[&>svg]:text-blue-400">
      <IconInfoCircle />
      <AlertTitle className="text-blue-900 dark:text-blue-200">Use</AlertTitle>
      <AlertDescription className="text-blue-900 dark:text-blue-200">
        {translations("Insert non-respondable text into your survey!")}
      </AlertDescription>
    </Alert>
  );
}
