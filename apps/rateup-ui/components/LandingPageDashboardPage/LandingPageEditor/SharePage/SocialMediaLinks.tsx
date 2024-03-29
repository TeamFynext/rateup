import { Box, Tooltip, Image, Button, ActionIcon } from "@mantine/core";
import styles from "./ShareLandingPage.module.css";
import { getLink, socialMediaLinks } from "./constants";
import FormModalLayout from "../../../Modal/FormModalLayout";
import IFrameModal from "../../../Survey/ShareSurvey/IFrameModal";
import { useDisclosure } from "@mantine/hooks";

function SocialMediaLinks({
  landingPageName,
  landingPageShareUrl,
  isPublished,
}) {
  const [
    isIframeModalOpen,
    { open: openIframeModal, close: closeIframeModal },
  ] = useDisclosure();

  return (
    <Box
      className={styles["social-media-links-container"]}
      style={{ opacity: !isPublished ? 0.5 : 1 }}
    >
      {socialMediaLinks.map((linkObj) => {
        const { id, iconSrc, alt, tooltipLabel, link } = linkObj;
        return (
          <Tooltip label={tooltipLabel} position="bottom" key={id}>
            {id === "iframe" ? (
              <ActionIcon onClick={openIframeModal} size={"2.5rem"}>
                <Image
                  className={styles["social-media-icon"]}
                  src={iconSrc}
                  alt={alt}
                />
              </ActionIcon>
            ) : (
              <a
                href={getLink(id, link, landingPageName, landingPageShareUrl)}
                target="_blank"
              >
                <Image
                  className={styles["social-media-icon"]}
                  src={iconSrc}
                  alt={alt}
                />
              </a>
            )}
          </Tooltip>
        );
      })}

      <FormModalLayout
        title="Generate IFrame"
        opened={isIframeModalOpen}
        onClose={closeIframeModal}
        size="lg"
        centered
      >
        <IFrameModal close={closeIframeModal} shareUrl={landingPageShareUrl} />
      </FormModalLayout>
    </Box>
  );
}

export default SocialMediaLinks;
