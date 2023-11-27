import { Anchor, Center, Group, Image, Text } from "@mantine/core";

export default function RateupRedirectCard({
  alternateLogo,
  color,
}: {
  color?: string;
  alternateLogo?: string;
}) {
  return (
    <Center>
      <Anchor href="https://www.rateup.app">
        <Group gap={5}>
          <Text fz="sm" c={`${color}`}>
            Powered by{" "}
          </Text>
          <Image
            pl={10}
            src={
              alternateLogo
                ? alternateLogo
                : `${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/logo.svg`
            }
            alt="RateUp Logo"
            w={80}
            h={25}
          />
        </Group>
      </Anchor>
    </Center>
  );
}
