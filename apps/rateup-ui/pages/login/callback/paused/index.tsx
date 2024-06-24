import { Center, Stack, Text, Image, Anchor } from "@mantine/core";
import { useRouter } from "next/router";
import { RateupButtonBlue } from "../../../../components/Button/RateupButtons";
import { IconLogout } from "@tabler/icons-react";
import { useMediaQuery } from "@mantine/hooks";
import PaperLayout from "../../../../components/styled/Layouts/PaperLayout";

const PausedPage = () => {
  const router = useRouter();
  const { pausedby } = router.query;
  const isMobile = useMediaQuery("(max-width: 480px)");

  return (
    <Center h={"100vh"}>
      <PaperLayout w={"fit-content"} p={"xl"}>
        <Stack align="center">
          <Image
            src={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/bw-logo.png`}
            alt="Logo"
            w={isMobile ? 70 : 80}
            h={isMobile ? 70 : 80}
            fit={"contain"}
          />
          <Text size="xl" fw={600} c={"dimmed"}>
            Your account is Paused !
          </Text>
          {getPausedText(pausedby)}
          <RateupButtonBlue
            leftIcon={<IconLogout />}
            title="logout"
            onClick={() => router.push("/logout")}
          />
        </Stack>
      </PaperLayout>
    </Center>
  );
};

function getPausedText(pausedby) {
  switch (pausedby) {
    case "org":
      return (
        <Stack align="center">
          <Text c={"dimmed"}>
            Kindly contact your organization Super Admin for details.
          </Text>
        </Stack>
      );
    case "rateup":
      return (
        <Stack align="center">
          <Text c={"dimmed"}>Kindly contact Rateup Support for details.</Text>
          <Anchor>Mail: hello@rateup.app</Anchor>
        </Stack>
      );
  }
}
export default PausedPage;
