import { Box, Center, Image, Stack, Text } from "@mantine/core";
import {
  IconFileText,
  IconMapPin,
  IconPhoto,
  IconVideo,
} from "@tabler/icons-react";

import { WHATSAPP_TEMPLATE_BROADCAST_TYPE } from "../../../../utils/constants";

const MediaCardPreview = ({ children }) => {
  return (
    <Stack
      w={"100%"}
      mih={"80px"}
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
          <Box pos={"relative"} w={"100%"} p={0} component="span">
            {text instanceof File ? (
              <Image
                src={URL.createObjectURL(text)}
                mih={70}
                w={"100%"}
                alt="image of the template content"
              />
            ) : text?.startsWith("http") ? (
              <Image
                src={text}
                mih={70}
                w={"100%"}
                alt="image of the template content"
              />
            ) : (
              <Center component="span">
                <IconPhoto size={40} />
              </Center>
            )}
          </Box>
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
