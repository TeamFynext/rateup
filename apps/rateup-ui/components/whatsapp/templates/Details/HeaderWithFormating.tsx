import { Box, Stack, Text } from "@mantine/core";
import {
  IconPhoto,
  IconVideo,
  IconFileText,
  IconMapPin,
} from "@tabler/icons-react";
import { WHATSAPP_TEMPLATE_BROADCAST_TYPE } from "../../../../utils/constants";

const MediaCardPreview = ({ children }) => {
  return (
    <Stack w={"100%"} h={"80px"} justify="center" align="center">
      {children}
    </Stack>
  );
};

export function HeaderWithFormatting(text, type) {
  switch (type) {
    case WHATSAPP_TEMPLATE_BROADCAST_TYPE[1]:
      return (
        <Text
          fz={14}
          style={{
            wordBreak: "break-all",
          }}
        >
          {text}
        </Text>
      );
    case WHATSAPP_TEMPLATE_BROADCAST_TYPE[2]:
      return (
        <MediaCardPreview>
          <IconPhoto size={40} />
        </MediaCardPreview>
      );
    case WHATSAPP_TEMPLATE_BROADCAST_TYPE[3]:
      return (
        <MediaCardPreview>
          <IconVideo size={40} />
        </MediaCardPreview>
      );
    case WHATSAPP_TEMPLATE_BROADCAST_TYPE[4]:
      return (
        <MediaCardPreview>
          <IconFileText size={40} />
        </MediaCardPreview>
      );
    case WHATSAPP_TEMPLATE_BROADCAST_TYPE[5]:
      return (
        <>
          <MediaCardPreview>
            <IconMapPin size={40} />
          </MediaCardPreview>
          <Box bg={"var(--light-grey-color)"}>
            <Text fz={10}>{"{{Location name}}"}</Text>
            <Text fz={10}>{"{{Address}}"}</Text>
          </Box>
        </>
      );
    default:
      break;
  }
}
