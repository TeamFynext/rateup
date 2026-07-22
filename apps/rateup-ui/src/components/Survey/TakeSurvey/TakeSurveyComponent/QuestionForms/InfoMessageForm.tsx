import { IconInfoCircle } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";

export function InfoMessage() {
  const { t: translations } = useTranslation();
  return (
    <Alert className="border-[var(--shade-of-blue-5)] bg-[var(--shade-of-blue)] [&>svg]:text-[var(--shade-of-blue-5)]">
      <IconInfoCircle />
      <AlertTitle className="text-[var(--shade-of-blue-3)]">Use</AlertTitle>
      <AlertDescription className="text-[var(--shade-of-blue-3)]">
        {translations("Insert non-respondable text into your survey!")}
      </AlertDescription>
    </Alert>
  );
}
