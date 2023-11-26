import React from "react";
import {
  Paper,
  Text,
  Stack,
  Button,
  CopyButton,
  Group,
  TextInput,
  SimpleGrid,
  Title,
  ActionIcon,
  Modal,
  Flex,
  Tooltip,
} from "@mantine/core";
import {
  IconBrandFacebook,
  IconBrandWhatsapp,
  IconCopy,
  IconMail,
  IconMessage,
} from "@tabler/icons-react";
import ShareQR from "../../Survey/ShareSurvey/ShareQR";
function ShareLandingPage({ LandingId }) {
  const getLandingUrl = (LandingId) => {
    return `${process.env.NEXT_PUBLIC_FRONTEND_URL}/public/landing/${LandingId}`;
  };
  function shareButtonAction(btn) {
    const shareUrl = getLandingUrl(LandingId);
    switch (btn) {
      case "fb":
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`);
        break;
      case "mail":
        window.open(
          `mailto:?subject=Survey&body=Take a minute to complete the survey: \n${shareUrl} \n\n`,
        );
        break;
      case "whatsapp":
        const waShareUrl = encodeURIComponent(shareUrl);
        window.open(
          `https://web.whatsapp.com/send?text=Take a minute to complete the survey: \n${waShareUrl}`,
        );
        break;
      case "code":
        window.open(
          `sms:?&body=Take a minute to complete the survey: \n${shareUrl}`,
        );
      default:
        break;
    }
  }
  return (
    <Stack>
      <Paper p="md" radius="md" shadow="lg" style={{ minHeight: "200px" }}>
        <SimpleGrid spacing="xl" cols={2}>
          {/* //-----------------web survey share url ----------------- */}

          <Stack p="md" dir="row">
            <Title order={4}>Share Survey</Title>

            <CopyLinkComponent
              value={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/public/landing/${LandingId}`}
            />
          </Stack>

          {/* //-----------icons part-------------- */}

          <Stack style={{ maxWidth: "400px" }} p="md">
            <Title
              order={4}
              style={{
                textAlign: "center",
              }}
            >
              How would you like to survey people?
            </Title>
            <Group justify="center" gap="xl">
              <ActionIcon
                size="xl"
                variant="light"
                onClick={() => shareButtonAction("mail")}
              >
                <Tooltip
                  label="Share via Email"
                  withArrow
                  color="var(--light-grey-color)"
                  position="bottom"
                  styles={{ tooltip: { color: "grey" } }}
                >
                  <IconMail size="2rem" />
                </Tooltip>
              </ActionIcon>
              <ActionIcon
                size="xl"
                variant="light"
                onClick={() => shareButtonAction("whatsapp")}
              >
                <Tooltip
                  label="Share via WhatsApp"
                  withArrow
                  color="var(--light-grey-color)"
                  position="bottom"
                  styles={{ tooltip: { color: "grey" } }}
                >
                  <IconBrandWhatsapp size="2rem" />
                </Tooltip>
              </ActionIcon>
              <ActionIcon
                size="xl"
                variant="light"
                onClick={() => shareButtonAction("fb")}
              >
                <Tooltip
                  label="Share via Facebook"
                  withArrow
                  color="var(--light-grey-color)"
                  position="bottom"
                  styles={{ tooltip: { color: "grey" } }}
                >
                  <IconBrandFacebook size="2rem" />
                </Tooltip>
              </ActionIcon>
              <ActionIcon
                size="xl"
                variant="light"
                onClick={() => shareButtonAction("code")}
              >
                <Tooltip
                  label="Share via Message"
                  withArrow
                  color="var(--light-grey-color)"
                  position="bottom"
                  styles={{ tooltip: { color: "grey" } }}
                >
                  <IconMessage size="2rem" />
                </Tooltip>
              </ActionIcon>
            </Group>
          </Stack>
        </SimpleGrid>
      </Paper>
      <ShareQR url={getLandingUrl(LandingId)} />
    </Stack>
  );
}

export default ShareLandingPage;

const CopyLinkComponent = ({ value }) => {
  return (
    <Flex style={{ flexDirection: "row", display: "flex", width: "100%" }}>
      <TextInput
        style={{ minWidth: "70%" }}
        readOnly
        value={value}
        pr="sm"
      ></TextInput>
      <CopyButton value={value}>
        {({ copied, copy }) => (
          <Button
            color={copied ? "dark" : "yellow.6"}
            onClick={copy}
            rightSection={<IconCopy />}
          >
            {copied ? "Copied url" : "Copy url"}
          </Button>
        )}
      </CopyButton>
    </Flex>
  );
};
