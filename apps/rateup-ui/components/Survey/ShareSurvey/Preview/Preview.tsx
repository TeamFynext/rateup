"use client";

import { useEffect, useRef, useState } from "react";

import { IconDownload } from "@tabler/icons-react";
import domtoimage from "dom-to-image-more";
import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

import { showErrorToast } from "../../../../utils/notifications";
import CustomQRCode from "../components/CustomQrCode/CustomQrCode";
import { getLogoSrc } from "../ShareQR/utils";
import styles from "./Preview.module.css";

function Preview({
  url,
  surveyTitle,
  isSurveyPublished = true,
  customAttrForDownloadedQrFileName = "",
  logoTabPanelState,
}) {
  const {
    qrBgColor,
    qrColor,
    logoSize,
    logoFillType: qrBgImgFillType,
    logoBorderRadius,
    logoFile: qrBgImgLogo,
    isLogoEnabled = true,
  } = logoTabPanelState;

  const [isLogoDownloadProcessing, setIsLogoDownloadProcessing] =
    useState(false);

  const previewContainerRef = useRef(undefined);
  const translations = useTranslations();
  const logoSrc = getLogoSrc(qrBgImgLogo);

  useEffect(() => {
    return () => {
      URL.revokeObjectURL(logoSrc);
    };
  }, []);

  const downloadQrCode = async () => {
    const element: HTMLElement = previewContainerRef.current;
    if (element) {
      try {
        setIsLogoDownloadProcessing(true);
        const scale = 6;
        const dataUrl = await domtoimage.toPng(element, {
          width: element?.clientWidth * scale,
          height: element?.clientHeight * scale,
          style: {
            transform: "scale(" + scale + ")",
            transformOrigin: "top left",
          },
        });
        let link = document.createElement("a");
        link.download = `${surveyTitle ? surveyTitle : "surveylink-qr"}.png`;
        link.href = dataUrl;
        link.click();
        setIsLogoDownloadProcessing(false);
      } catch (err) {
        showErrorToast(
          translations("Unable to download QR, Please try again later"),
          "download-qr",
        );
        setIsLogoDownloadProcessing(false);
      }
    } else {
      showErrorToast(
        translations("Unable to download QR, Please try again later"),
        "download-qr",
      );
    }
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4 w-full">
      <div className="flex flex-col items-center justify-center">
        <div className="flex items-center gap-1">
          <Sparkles className="text-primary h-4 w-4" />
          <h2 className="font-bold text-sm">{translations("Live Preview")}</h2>
        </div>
        <span className="text-[11px] opacity-85">
          {translations("Updates in real-time")}
        </span>
      </div>
      <div
        className="w-[300px] h-[300px]"
        ref={previewContainerRef}
        data-tagname={customAttrForDownloadedQrFileName}
        style={{
          padding: 10,
          backgroundColor: `${qrBgColor}`,
        }}
      >
        <div
          className="relative"
          style={{
            width: "100%",
            height: "100%",
          }}
        >
          {isLogoEnabled && (
            <img
              className={styles["qr-bg-img"]}
              src={logoSrc}
              alt="bg-image"
              width={500}
              height={500}
              style={{
                width: logoSize,
                height: logoSize,
                top: `calc(50% - ${logoSize / 2}px)`,
                left: `calc(50% - ${logoSize / 2}px)`,
                objectFit: qrBgImgFillType as any,
                borderRadius: `${logoBorderRadius}%`,
              }}
            />
          )}

          {
            <CustomQRCode
              className={styles["qr-svg"]}
              textToBeEmbedded={url || process.env.NEXT_PUBLIC_FRONTEND_URL}
              errorCorrectionLevel={"H"}
              qrColor={qrColor}
            />
          }
        </div>
      </div>
      <Button
        onClick={downloadQrCode}
        disabled={!isSurveyPublished || isLogoDownloadProcessing}
        className="disabled:opacity-50 w-full"
      >
        <IconDownload />
        {translations("Download QR Code")}
      </Button>
    </div>
  );
}

export default Preview;
