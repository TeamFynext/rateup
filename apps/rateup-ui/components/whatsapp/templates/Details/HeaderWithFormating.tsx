import { Box, Image, Stack, Text } from "@mantine/core";
import {
  IconPhoto,
  IconVideo,
  IconFileText,
  IconMapPin,
} from "@tabler/icons-react";
import { WHATSAPP_TEMPLATE_BROADCAST_TYPE } from "../../../../utils/constants";

const MediaCardPreview = ({ children }) => {
  return (
    <Stack
      w={"100%"}
      h={"80px"}
      justify="center"
      align="center"
      component={"span"}
    >
      {children}
    </Stack>
  );
};

export function HeaderWithFormatting(text, type) {
  switch (type) {
    case WHATSAPP_TEMPLATE_BROADCAST_TYPE.TEXT:
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
    case WHATSAPP_TEMPLATE_BROADCAST_TYPE.IMAGE:
      return (
        <MediaCardPreview>
          {text instanceof File ? (
            <Image
              src={URL.createObjectURL(text)}
              h={50}
              w={50}
              alt="image of the template content"
            />
          ) : text?.startsWith("http") ? (
            <Image
              src={text}
              h={50}
              w={50}
              alt="image of the template content"
            />
          ) : (
            <IconPhoto size={40} />
          )}
        </MediaCardPreview>
      );
    case WHATSAPP_TEMPLATE_BROADCAST_TYPE.VIDEO:
      return (
        <MediaCardPreview>
          <IconVideo size={40} />
        </MediaCardPreview>
      );
    case WHATSAPP_TEMPLATE_BROADCAST_TYPE.DOCUMENT:
      return (
        <MediaCardPreview>
          <IconFileText size={40} />
        </MediaCardPreview>
      );
    case WHATSAPP_TEMPLATE_BROADCAST_TYPE.LOCATION:
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
