import { Anchor, Center, Group, Image, Text } from "@mantine/core";

export default function RateupRedirectCard({
  alternateLogo,
}: {
  alternateLogo?: boolean;
}) {
  return (
    <Center bg={alternateLogo ? "" : "white"}>
      <Anchor href="https://www.rateup.app">
        <Group>
          {alternateLogo ? (
            <Image
              src={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/rateup-credits-white.svg`}
              height={30}
              width={30}
              fit="contain"
            />
          ) : (
            <Image
              src={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/rateup-credits.svg`}
              height={30}
              width={30}
              fit="contain"
            />
          )}
        </Group>
      </Anchor>
    </Center>
  );
}
