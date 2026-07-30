import { IconDownload } from "@tabler/icons-react";
import { toPng } from "html-to-image";
import { Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button.tsx";

import CustomQRCode from "../components/CustomQrCode/CustomQrCode.tsx";

import styles from "./Preview.module.css";

function Preview({
  url,
  surveyTitle,
  isSurveyPublished = true,
  customAttrForDownloadedQrFileName = "",
  logoTabPanelState,
}: {
  url: string;
  surveyTitle: string;
  logoTabPanelState: Record<string, unknown>;
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

  const [isLogoDownloadProcessing, setIsLogoDownloadProcessing] = useState(false);

  const previewContainerRef = useRef(undefined);
  const { t: translations } = useTranslation();
  const [logoSrc, setLogoSrc] = useState<string | null>(null);
  const FALLBACK_LOGO = "/images/rateup-icon.png";

  const finalLogoSrc = logoSrc || FALLBACK_LOGO;

  useEffect(() => {
    if (!qrBgImgLogo) {
      setLogoSrc(null);
      return;
    }

    if (qrBgImgLogo instanceof File) {
      const objectUrl = URL.createObjectURL(qrBgImgLogo);
      setLogoSrc(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }

    if (typeof qrBgImgLogo === "string") {
      setLogoSrc(qrBgImgLogo);
      return;
    }

    setLogoSrc(null);
  }, [qrBgImgLogo]);

  const downloadQrCode = async () => {
    const element = previewContainerRef.current;
    if (!element) return;

    try {
      setIsLogoDownloadProcessing(true);

      const dataUrl = await toPng(element, {
        cacheBust: true,
        pixelRatio: 4, // high quality
      });

      const link = document.createElement("a");
      link.download = `${surveyTitle || "surveylink-qr"}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Download failed:", err);
      toast.error("Unable to download QR");
    } finally {
      setIsLogoDownloadProcessing(false);
    }
  };
  return (
    <div className="flex flex-col items-center justify-center gap-4 w-full">
      <div className="flex flex-col items-center justify-center">
        <div className="flex items-center gap-1">
          <Sparkles className="text-primary h-4 w-4" />
          <h2 className="font-bold text-sm">{translations("Live Preview")}</h2>
        </div>
        <span className="text-[11px] opacity-85">{translations("Updates in real-time")}</span>
      </div>
      <div
        className={styles["preview-container"]}
        ref={previewContainerRef}
        data-tagname={customAttrForDownloadedQrFileName}
        style={{
          padding: 10,
          backgroundColor: `${qrBgColor}`,
        }}
      >
        <div
          className={styles["qr-svg-bg-img-container"]}
          style={{
            width: "100%",
            height: "100%",
          }}
        >
          {isLogoEnabled && (
            <img
              className={styles["qr-bg-img"]}
              src={finalLogoSrc}
              alt="bg-image"
              width={500}
              height={500}
              style={{
                width: logoSize,
                height: logoSize,
                top: `calc(50% - ${logoSize / 2}px)`,
                left: `calc(50% - ${logoSize / 2}px)`,
                objectFit: qrBgImgFillType,
                borderRadius: `${logoBorderRadius}%`,
              }}
            />
          )}

          {
            <CustomQRCode
              className={styles["qr-svg"]}
              textToBeEmbedded={url || import.meta.env.VITE_FRONTEND_URL}
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
        variant="outline"
      >
        <IconDownload />
        {translations("Download QR Code")}
      </Button>
    </div>
  );
}

export default Preview;
