import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@rateup/ui/components/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@rateup/ui/components/tooltip";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { SurveyType } from "@/types/enums.ts";
import { imagesPath } from "@/utils/constants.ts";

import IFrameModal from "./IFrameModal.tsx";

interface ShareMethodsProps {
  survey: Survey;
  shareUrl: string;
  disableShare: boolean;
}
/** Shows Different ways to share. (email, whatsapp, facebook) */
export function ShareMethods({ disableShare, shareUrl, survey }: ShareMethodsProps) {
  const [openedIframe, setOpenedIframe] = useState(false);

  function shareButtonAction(btn: string) {
    switch (btn) {
      case "fb":
        window.open(
          `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`,
          "_blank",
          "noopener,noreferrer",
        );
        break;
      case "mail":
        window.open(
          `mailto:?subject=Survey&body=Take a minute to complete the survey: \n ${survey?.title} \n${shareUrl} \n\n`,
          "_blank",
          "noopener,noreferrer",
        );
        break;
      case "whatsapp":
        const waShareUrl = encodeURIComponent(shareUrl);
        window.open(
          `https://web.whatsapp.com/send?text=Take a minute to complete the survey: \n${waShareUrl}`,
          "_blank",
          "noopener,noreferrer",
        );
        break;
      default:
        break;
    }
  }
  const { t: translations } = useTranslation();

  return (
    <div className="flex min-w-[300px] flex-1 flex-col gap-4">
      <h4 className="text-center text-lg font-semibold">
        {translations("How would you like to survey people?")}
      </h4>
      <div className="flex flex-wrap justify-center gap-8">
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                disabled={disableShare}
                onClick={() => shareButtonAction("mail")}
                className="rounded-lg p-2 transition-colors hover:bg-muted disabled:cursor-not-allowed"
              />
            }
          >
            <img
              alt="mail icon"
              src={`${import.meta.env.VITE_WEB_IMAGES_CDN_URL}/images/social-media-icons/mail.svg`}
              className="size-10 object-contain"
              style={{ opacity: !disableShare ? 1 : 0.5 }}
            />
          </TooltipTrigger>
          <TooltipContent>{translations("Share via Email")}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            render={
              <button
                disabled={disableShare}
                onClick={() => shareButtonAction("whatsapp")}
                className="rounded-lg p-2 transition-colors hover:bg-muted disabled:cursor-not-allowed"
              />
            }
          >
            <img
              alt="whatsapp icon"
              src={`${import.meta.env.VITE_WEB_IMAGES_CDN_URL}/images/social-media-icons/whatsapp.svg`}
              className="size-10 object-contain"
              style={{ opacity: !disableShare ? 1 : 0.5 }}
            />
          </TooltipTrigger>
          <TooltipContent>{translations("Share via WhatsApp")}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            render={
              <button
                disabled={disableShare}
                onClick={() => shareButtonAction("fb")}
                className="rounded-lg p-2 transition-colors hover:bg-muted disabled:cursor-not-allowed"
              />
            }
          >
            <img
              alt="facebook icon"
              src={`${import.meta.env.VITE_WEB_IMAGES_CDN_URL}/images/social-media-icons/facebook.svg`}
              className="size-10 object-contain"
              style={{ opacity: !disableShare ? 1 : 0.5 }}
            />
          </TooltipTrigger>
          <TooltipContent>{translations("Share via Facebook")}</TooltipContent>
        </Tooltip>

        {survey?.type === SurveyType.Web && (
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  disabled={disableShare}
                  onClick={() => setOpenedIframe(true)}
                  className="rounded-lg p-2 transition-colors hover:bg-muted disabled:cursor-not-allowed"
                />
              }
            >
              <img
                alt="iframe icon"
                src={`${imagesPath}/iframe-icon.png`}
                className="size-10 object-contain"
                style={{ opacity: !disableShare ? 1 : 0.5 }}
              />
            </TooltipTrigger>
            <TooltipContent>{translations("Embed as iframe")}</TooltipContent>
          </Tooltip>
        )}
      </div>

      <Dialog open={openedIframe} onOpenChange={setOpenedIframe}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{translations("Generate IFrame")}</DialogTitle>
          </DialogHeader>
          <IFrameModal close={() => setOpenedIframe(false)} shareUrl={shareUrl} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
