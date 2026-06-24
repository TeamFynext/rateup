import { ActionIcon, Box, Image, Tooltip } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";

import FormModalLayout from "../../../Modal/FormModalLayout.tsx";
import IFrameModal from "../../../Survey/ShareSurvey/IFrameModal.tsx";
import { getLink, socialMediaLinks } from "./constants.tsx";

import styles from "./ShareLinktree.module.css";

function SocialMediaLinks({ linktreeName, linktreeShareUrl, isPublished }) {
  const [isIframeModalOpen, { open: openIframeModal, close: closeIframeModal }] = useDisclosure();

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
              <a href={getLink(id, link, linktreeName, linktreeShareUrl)} target="_blank">
                <Image className={styles["social-media-icon"]} src={iconSrc} alt={alt} />
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
        <IFrameModal close={closeIframeModal} shareUrl={linktreeShareUrl} />
      </FormModalLayout>
    </Box>
  );
}

export default SocialMediaLinks;
