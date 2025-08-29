"use client";

import { useEffect, useRef, useState } from "react";

import { Box, Image, Stack } from "@mantine/core";
import { IconDownload } from "@tabler/icons-react";
import domtoimage from "dom-to-image-more";
import { useTranslations } from "next-intl";

import { showErrorToast } from "../../../../utils/notifications";
import { RateupButtonBlue } from "../../../Button/RateupButtons";
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
    <Stack className={styles["preview-download-btn-container"]}>
      <Stack
        className={styles["preview-container"]}
        ref={previewContainerRef}
        data-tagname={customAttrForDownloadedQrFileName}
        style={{
          padding: 10,
          backgroundColor: `${qrBgColor}`,
        }}
      >
        <Box
          className={styles["qr-svg-bg-img-container"]}
          style={{
            width: "100%",
            height: "100%",
          }}
        >
          {isLogoEnabled && (
            <Image
              className={styles["qr-bg-img"]}
              src={logoSrc}
              alt="bg-image"
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
              textToBeEmbedded={url}
              errorCorrectionLevel={"H"}
              qrColor={qrColor}
            />
          }
        </Box>
      </Stack>

      <RateupButtonBlue
        className={styles["qr-download-btn"]}
        title={translations("Download QR Code")}
        onClick={downloadQrCode}
        rightIcon={<IconDownload />}
        loading={isLogoDownloadProcessing}
        disabled={!isSurveyPublished}
      />
    </Stack>
  );
}

export default Preview;
