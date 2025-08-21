import {
  BackgroundImage,
  Box,
  Flex,
  ScrollArea,
  ScrollAreaAutosize,
  Text,
} from "@mantine/core";
import {
  IconAntennaBars5,
  IconBatteryFilled,
  IconInfoCircle,
  IconWifi,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";

import PaperLayout from "../../styled/Layouts/PaperLayout";
import { SendMessageMock } from "../MessageComponents";

const WaChatPreview = ({ children }) => {
  const translations = useTranslations();
  return (
    <PaperLayout p={7} h={"100%"} maw={280}>
      <BackgroundImage
        style={{
          backgroundColor: "#efeae2",
          borderRadius: "8px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
        src={`${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/whatsapp/whatsapp_chat_bg.jpg`}
        h={"100%"}
      >
        <div>
          <Flex
            bg={"var(--wa-dark-green)"}
            justify={"space-between"}
            c={"white"}
            style={{
              borderRadius: "12px 12px 0px 0px",
            }}
            h={20}
          >
            <Text fz={8} ml={"md"} mt={4}>
              {dayjs().format("HH:mm")}
            </Text>
            <Box mr={4}>
              <IconAntennaBars5 size={12} />
              <IconWifi size={12} />
              <IconBatteryFilled size={12} />
            </Box>
          </Flex>
          <Box bg={"var(--wa-green)"} h={30} />
          <ScrollAreaAutosize mah={440}>
            <Text
              fz={8}
              m={"xs"}
              bg={"var(--wa-alert-info)"}
              px={"xs"}
              fw={500}
              style={{
                borderRadius: 4,
              }}
            >
              <IconInfoCircle size={8} />
              {translations(
                "This business uses a secure service from Meta to manage this chat. Tap to learn more",
              )}
            </Text>
            {children}
          </ScrollAreaAutosize>
        </div>
        <SendMessageMock />
      </BackgroundImage>
    </PaperLayout>
  );
};

export default WaChatPreview;
