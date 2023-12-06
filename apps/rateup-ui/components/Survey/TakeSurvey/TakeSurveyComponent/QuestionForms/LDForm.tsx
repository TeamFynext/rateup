import { useContext } from "react";
import { CurrentResponsesContext } from "../../../../../context/ResponseContext";
import { Box, Group } from "@mantine/core";
import { RateupButtonBlue } from "../../../../Button/RateupButtons";
import { IconThumbDownFilled, IconThumbUpFilled } from "@tabler/icons-react";
import { LDResponse } from "../../../../../types/enums";
import { useMediaQuery } from "@mantine/hooks";

export function LDForm() {
  const isMobile = useMediaQuery("(max-width: 480px)");
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  return (
    <Group>
      <Box w={150}>
        <RateupButtonBlue
          size="md"
          variant={response === LDResponse.Dislike ? "filled" : "outline"}
          radius="xl"
          title="Dislike"
          leftIcon={<IconThumbDownFilled />}
          fullWidth
          onClick={() => updateResponse(LDResponse.Dislike)}
        />
      </Box>
      <Box w={150} ml={!isMobile && "sm"}>
        <RateupButtonBlue
          size="md"
          variant={response === LDResponse.Like ? "filled" : "outline"}
          radius="xl"
          title="Like"
          fullWidth
          leftIcon={<IconThumbUpFilled />}
          onClick={() => updateResponse(LDResponse.Like)}
        />
      </Box>
    </Group>
  );
}
