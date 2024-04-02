import { Alert } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";

export function InfoMessage() {
  const icon = <IconInfoCircle />;
  return (
    <Alert variant="light" color="blue" title="Use" icon={icon}>
      Insert non-respondable text into your survey!
    </Alert>
  );
}
