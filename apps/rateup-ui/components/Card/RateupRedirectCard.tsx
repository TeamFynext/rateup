import {
  Anchor,
  Center,
  Group,
  Image,
  Text,
  useMantineTheme,
} from "@mantine/core";
import { returnColorsForTheme } from "../Survey/SurveyTheme/SurveyTheme.utils";
import { styleAttributeTypesEnum } from "../Survey/SurveyTheme/SurveyTheme.enums";

export default function RateupRedirectCard() {
  const theme = useMantineTheme();
  return (
    <Center
      bg={returnColorsForTheme(styleAttributeTypesEnum.BACKGROUND, theme)}
      w={"fit-content"}
      m={"auto"}
      px={"sm"}
      pt={5}
      style={{ borderTopRightRadius: 10, borderTopLeftRadius: 10 }}
    >
      <Anchor href="https://www.rateup.app">
        <Group gap={0} align="flex-end">
          <Text fz={10} mb={2}>
            Powered By
          </Text>
          <Image
            src={`${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/rateup_logo.svg`}
            height={30}
            width={30}
            fit="contain"
          />
        </Group>
      </Anchor>
    </Center>
  );
}
