import {
  Anchor,
  Center,
  Group,
  Image,
  Text,
  useMantineTheme,
} from "@mantine/core";
import { useTranslations } from "next-intl";

export default function RateupRedirectCard({ className = "" }) {
  const theme = useMantineTheme();
  const translations = useTranslations();
  return (
    <Center
      className={className}
      bg={`white`}
      w={150}
      m={"auto"}
      px={"sm"}
      pt={5}
      style={{
        borderTopRightRadius: 10,
        borderTopLeftRadius: 10,
      }}
    >
      <Anchor
        href="https://www.rateup.app"
        styles={{ root: { width: "fit-content" } }}
      >
        <Group gap={0} align="flex-end" justify="center">
          <Text fz={10} mb={2} c={"grey"}>
            {translations("Powered By")}
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
