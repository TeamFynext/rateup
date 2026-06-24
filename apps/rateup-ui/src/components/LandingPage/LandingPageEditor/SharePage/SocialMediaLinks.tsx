import { ActionIcon, Box, Image, Tooltip } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useTranslation } from "react-i18next";

import FormModalLayout from "../../../Modal/FormModalLayout.tsx";
import IFrameModal from "../../../Survey/ShareSurvey/IFrameModal.tsx";
import { getLink, socialMediaLinks } from "./constants.tsx";

import styles from "./ShareLandingPage.module.css";

function SocialMediaLinks({ landingPageName, landingPageShareUrl, isPublished }) {
  const [isIframeModalOpen, { open: openIframeModal, close: closeIframeModal }] = useDisclosure();
  const { t: translations } = useTranslation();
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
                <Image className={styles["social-media-icon"]} src={iconSrc} alt={alt} />
              </ActionIcon>
            ) : (
              <a href={getLink(id, link, landingPageName, landingPageShareUrl)} target="_blank">
                <Image className={styles["social-media-icon"]} src={iconSrc} alt={alt} />
              </a>
            )}
          </Tooltip>
        );
      })}
      <FormModalLayout
        title={translations("Generate IFrame")}
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
