import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useDisclosure } from "@/hooks/useDisclosure";

import IFrameModal from "../../../Survey/ShareSurvey/IFrameModal.tsx";
import { getLink, socialMediaLinks } from "./constants.tsx";

import styles from "./ShareLinktree.module.css";

function SocialMediaLinks({
  linktreeName,
  linktreeShareUrl,
  isPublished,
}: {
  linktreeName: string;
  linktreeShareUrl: string;
  isPublished: boolean;
}) {
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

      <Dialog
        open={isIframeModalOpen}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) closeIframeModal();
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-auto sm:max-w-175">
          <DialogHeader>
            <DialogTitle className="text-center text-3xl font-semibold">
              Generate IFrame
            </DialogTitle>
          </DialogHeader>
          <IFrameModal close={closeIframeModal} shareUrl={linktreeShareUrl} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default SocialMediaLinks;
