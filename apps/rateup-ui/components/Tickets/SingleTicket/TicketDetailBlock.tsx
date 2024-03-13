import { Group } from "@mantine/core";
import PaperLayout from "../../styled/Layouts/PaperLayout";

export function TicketDetailBlock({
  children,
  mawInp = "300",
  miwInput = "70",
  ...rest
}) {
  return (
    <PaperLayout
      hoveractive
      mah={80}
      mih={miwInput}
      miw={150}
      maw={mawInp}
      p="md"
      shadow="xl"
      radius="lg"
      {...rest}
    >
      <Group align="center">{children}</Group>
    </PaperLayout>
  );
}
