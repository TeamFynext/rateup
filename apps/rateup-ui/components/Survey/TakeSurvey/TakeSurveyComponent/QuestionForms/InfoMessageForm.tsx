import { Alert } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";

export function InfoMessage() {
  const icon = <IconInfoCircle />;
  return (
    <Alert variant="light" color="blue" title="Use" icon={icon}>
      Survey Introduction or Before we proceed to the next set of questions,
      here's a brief message to help transition smoothly.
    </Alert>
  );
}
