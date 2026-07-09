import { useDisclosure } from "@mantine/hooks";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import FormModalLayout from "../../../Modal/FormModalLayout.tsx";
import IFrameModal from "../../../Survey/ShareSurvey/IFrameModal.tsx";
import { getLink, socialMediaLinks } from "./constants.tsx";

import styles from "./ShareLinktree.module.css";

function SocialMediaLinks({ linktreeName, linktreeShareUrl, isPublished }) {
  const [isIframeModalOpen, { open: openIframeModal, close: closeIframeModal }] = useDisclosure();

  return (
    <div
      className={styles["social-media-links-container"]}
      style={{ opacity: !isPublished ? 0.5 : 1 }}
    >
      <TooltipProvider>
        {socialMediaLinks.map((linkObj) => {
          const { id, iconSrc, alt, tooltipLabel, link } = linkObj;
          return (
            <Tooltip key={id}>
              <TooltipTrigger
                render={
                  id === "iframe" ? (
                    <Button variant="ghost" size="icon-lg" onClick={openIframeModal} />
                  ) : (
                    <a href={getLink(id, link, linktreeName, linktreeShareUrl)} target="_blank" />
                  )
                }
              >
                <img className={styles["social-media-icon"]} src={iconSrc} alt={alt} />
              </TooltipTrigger>
              <TooltipContent side="bottom">{tooltipLabel}</TooltipContent>
            </Tooltip>
          );
        })}
      </TooltipProvider>

      <FormModalLayout
        title="Generate IFrame"
        opened={isIframeModalOpen}
        onClose={closeIframeModal}
        size="lg"
        centered
      >
        <IFrameModal close={closeIframeModal} shareUrl={linktreeShareUrl} />
      </FormModalLayout>
    </div>
  );
}

export default SocialMediaLinks;
