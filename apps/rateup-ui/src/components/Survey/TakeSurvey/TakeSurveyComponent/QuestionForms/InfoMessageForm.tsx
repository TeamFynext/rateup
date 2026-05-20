"use client";

import { Alert } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function InfoMessage() {
  const icon = <IconInfoCircle />;
  const { t: translations } = useTranslation();
  return (
    <Alert variant="light" color="blue" title="Use" icon={icon}>
      {translations("Insert non-respondable text into your survey!")}
    </Alert>
  );
}
