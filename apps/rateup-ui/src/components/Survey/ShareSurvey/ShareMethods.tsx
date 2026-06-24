import { ActionIcon, Group, Image, Stack, Title, Tooltip } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useTranslation } from "react-i18next";

import { SurveyType } from "@/types/enums.ts";

import FormModalLayout from "../../Modal/FormModalLayout.tsx";
import IFrameModal from "./IFrameModal.tsx";

interface ShareMethodsProps {
  survey: Survey;
  shareUrl: string;
  disableShare: boolean;
}
/** Shows Different ways to share. (email, whatsapp, facebook) */
export function ShareMethods({ disableShare, shareUrl, survey }: ShareMethodsProps) {
  const [openedIframe, { open: openIframe, close: closeIframe }] = useDisclosure(false);

  function shareButtonAction(btn: string) {
    switch (btn) {
      case "fb":
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`);
        break;
      case "mail":
        window.open(
          `mailto:?subject=Survey&body=Take a minute to complete the survey: \n ${survey?.title} \n${shareUrl} \n\n`,
        );
        break;
      case "whatsapp":
        const waShareUrl = encodeURIComponent(shareUrl);
        window.open(
          `https://web.whatsapp.com/send?text=Take a minute to complete the survey: \n${waShareUrl}`,
        );
        break;
      default:
        break;
    }
  }
  const { t: translations } = useTranslation();

  return (
    <Stack style={{ minWidth: 300, flex: 1 }} p="md">
      <Title order={4} style={{ textAlign: "center" }}>
        {translations("How would you like to survey people?")}
      </Title>
      <Group justify="center" gap="xl">
        <ActionIcon
          disabled={disableShare}
          size="xl"
          variant="light"
          onClick={() => shareButtonAction("mail")}
          style={{ background: "none" }}
        >
          <Tooltip
            label={translations("Share via Email")}
            withArrow
            color="var(--light-grey-color)"
            position="bottom"
            styles={{ tooltip: { color: "grey" } }}
          >
            <Image
              opacity={!disableShare ? 1 : 0.5}
              alt="mail icon"
              src={`${import.meta.env.VITE_CLOUDFRONT_WEB_IMAGES_URL}/images/social-media-icons/mail.svg`}
              w={40}
              h={40}
              style={{ objectFit: "contain" }}
            />
          </Tooltip>
        </ActionIcon>
        <ActionIcon
          disabled={disableShare}
          size="xl"
          variant="light"
          onClick={() => shareButtonAction("whatsapp")}
          style={{ background: "none" }}
        >
          <Tooltip
            label={translations("Share via WhatsApp")}
            withArrow
            color="var(--light-grey-color)"
            position="bottom"
            styles={{ tooltip: { color: "grey" } }}
          >
            <Image
              opacity={!disableShare ? 1 : 0.5}
              alt="whatsapp icon"
              src={`${import.meta.env.VITE_CLOUDFRONT_WEB_IMAGES_URL}/images/social-media-icons/whatsapp.svg`}
              w={40}
              h={40}
              style={{ objectFit: "contain" }}
            />
          </Tooltip>
        </ActionIcon>
        <ActionIcon
          disabled={disableShare}
          size="xl"
          variant="light"
          onClick={() => shareButtonAction("fb")}
          style={{ background: "none" }}
        >
          <Tooltip
            label={translations("Share via Facebook")}
            withArrow
            color="var(--light-grey-color)"
            position="bottom"
            styles={{ tooltip: { color: "grey" } }}
          >
            <Image
              opacity={!disableShare ? 1 : 0.5}
              alt="facebook icon"
              src={`${import.meta.env.VITE_CLOUDFRONT_WEB_IMAGES_URL}/images/social-media-icons/facebook.svg`}
              w={40}
              h={40}
              style={{ objectFit: "contain" }}
            />
          </Tooltip>
        </ActionIcon>
        {survey?.type === SurveyType.Web && (
          <ActionIcon
            disabled={disableShare}
            size="xl"
            variant="light"
            onClick={openIframe}
            style={{ background: "none" }}
          >
            <Tooltip
              label={translations("Embed as iframe")}
              withArrow
              color="var(--light-grey-color)"
              position="bottom"
              styles={{ tooltip: { color: "grey" } }}
            >
              <Image
                opacity={!disableShare ? 1 : 0.5}
                alt="iframe icon"
                src={`${import.meta.env.VITE_FRONTEND_URL}/images/iframe-icon.png`}
                w={40}
                h={40}
                style={{ objectFit: "contain" }}
              />
            </Tooltip>
          </ActionIcon>
        )}
      </Group>
      <FormModalLayout
        title={translations("Generate IFrame")}
        opened={openedIframe}
        onClose={closeIframe}
        size="lg"
        centered
      >
        <IFrameModal close={closeIframe} shareUrl={shareUrl} />
      </FormModalLayout>
    </Stack>
  );
}
