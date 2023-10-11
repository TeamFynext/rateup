import {
  Stack,
  Button,
  CopyButton,
  Group,
  SimpleGrid,
  Title,
  ActionIcon,
} from "@mantine/core";
import {
  IconBrandFacebook,
  IconBrandWhatsapp,
  IconCopy,
  IconMail,
} from "@tabler/icons-react";
import { useRouter } from "next/router";
import React, { useState, useEffect } from "react";
import { ContainedTextField } from "../../input/ContainedInput/ContainedInput";
import PaperLayout from "../../styled/Layouts/PaperLayout";
import ShareQR from "./ShareQR";

let whatsAppEncoded;

const ShareSurvey = ({ survey }) => {
  const { surveyId } = useRouter().query;
  const [shareUrl, setShareUrl] = useState("");

  useEffect(() => {
    setShareUrl(
      `${process.env.NEXT_PUBLIC_FRONTEND_URL}/public/survey/${surveyId}`,
    );
  }, [surveyId]);

  useEffect(() => {
    var myMessage = `Take minute to complete survey:  ${survey?.title} - ${shareUrl}`;
    var messageToWhatsApp = encodeURIComponent(myMessage);
    whatsAppEncoded = "https://wa.me/?text=" + messageToWhatsApp;
  }, [survey, shareUrl]);

  function shareButtonAction(btn) {
    switch (btn) {
      case "fb":
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`);
        break;
      case "mail":
        window.open(
          `mailto:?subject=Survey&body=Take minute to complete the survey: \n ${survey?.title} \n${shareUrl} \n\n`,
        );
        break;
      case "whatsapp":
        window.open(whatsAppEncoded);
        break;
      default:
        break;
    }
  }

  return (
    <Stack p={2}>
      <PaperLayout p="md" radius="md" shadow="lg">
        <SimpleGrid cols={2} spacing="xl">
          {/* //-----------------web survey share url ----------------- */}
          {survey.type == "web" ? (
            <Stack style={{ maxWidth: "450px" }} p="md">
              <Title order={4}>Share Survey</Title>

              <CopyLinkComponent value={shareUrl} />
            </Stack>
          ) : (
            //-----whatsapp survey share url copy section ----------
            <Stack style={{ maxWidth: "450px" }} p="md">
              <Title order={6}>Share via whatsapp</Title>

              <CopyLinkComponent
                // TODO: move phone number to env
                value={"https://wa.me/9744520889?text=" + survey.id}
              />
            </Stack>
          )}

          <Stack style={{ maxWidth: "400px" }} p="md">
            <Title order={4} style={{ textAlign: "center" }}>
              How would you like to survey people?
            </Title>
            <Group justify="center">
              <ActionIcon
                size="xl"
                variant="light"
                onClick={() => shareButtonAction("mail")}
              >
                <IconMail size="2rem" />
              </ActionIcon>
              <ActionIcon
                size="xl"
                variant="light"
                onClick={() => shareButtonAction("whatsapp")}
              >
                <IconBrandWhatsapp size="2rem" />
              </ActionIcon>
              <ActionIcon
                size="xl"
                variant="light"
                onClick={() => shareButtonAction("fb")}
              >
                <IconBrandFacebook size="2rem" />
              </ActionIcon>
            </Group>
          </Stack>
        </SimpleGrid>
      </PaperLayout>

      <ShareQR url={shareUrl} sx={{ borderRadius: "0.5rem" }} />
    </Stack>
  );
};

interface CopyLinkComponentProps {
  value: string;
  disabled?: boolean;
  label?: string;
}
export const CopyLinkComponent = ({
  value,
  disabled = false,
  label = "",
}: CopyLinkComponentProps) => {
  return (
    <Group gap={"0px"} align="center">
      <ContainedTextField
        readOnly
        value={value}
        label={label}
        pr="sm"
        disabled={disabled}
        style={{
          maxWidth: "600px",
          flexGrow: 1,
        }}
      />
      <CopyButton value={value}>
        {({ copied, copy }) => (
          <Button
            color={copied ? "dark" : "yellow.6"}
            onClick={copy}
            rightSection={<IconCopy />}
            disabled={disabled}
          >
            {copied ? "Copied url" : "Copy url"}
          </Button>
        )}
      </CopyButton>
    </Group>
  );
};

export default ShareSurvey;
