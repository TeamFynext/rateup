import { Group } from "@mantine/core";
import PaperLayout from "../../styled/Layouts/PaperLayout";

export function TicketDetailBlock({ children }) {
  return (
    <PaperLayout
      hoveractive
      mah={75}
      mih={75}
      miw={150}
      maw={270}
      p="md"
      shadow="xl"
      radius="lg"
    >
      <Group align="center">{children}</Group>
    </PaperLayout>
  );
}
