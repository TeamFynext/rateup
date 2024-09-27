import { Alert } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";

import useTranslations from "@/dictionaries/useTranslation";

export function InfoMessage() {
  const icon = <IconInfoCircle />;
  const { translations } = useTranslations();
  return (
    <Alert variant="light" color="blue" title="Use" icon={icon}>
      {translations["Insert non-respondable text into your survey!"]}
    </Alert>
  );
}
