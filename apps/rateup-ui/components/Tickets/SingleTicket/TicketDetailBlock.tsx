import { Box, Group } from "@mantine/core";

import PaperLayout from "../../styled/Layouts/PaperLayout";

export function TicketDetailBlock({
  children,
  mawInp = "385",
  mihInput = "110",
  ...rest
}) {
  return (
    <PaperLayout
      hoveractive
      mah={85}
      mih={mihInput}
      miw={150}
      maw={mawInp}
      p="md"
      shadow="xl"
      radius="lg"
      {...rest}
      style={{ display: "flex" }}
    >
      <Box style={{ display: "flex" }}>
        <Group align="center" style={{}}>
          {children}
        </Group>
      </Box>
    </PaperLayout>
  );
}
