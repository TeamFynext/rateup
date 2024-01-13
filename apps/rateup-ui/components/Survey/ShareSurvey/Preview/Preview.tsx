import { Title, Stack, Text, Image, Box } from "@mantine/core";
import CustomQRCode from "../components/CustomQrCode/CustomQrCode";
import styles from "./Preview.module.css";
import { RateupButtonBlue } from "../../../Button/RateupButtons";
import { IconDownload } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import domtoimage from "dom-to-image-more";
import { getLogoSrc } from "../ShareQR/utils";

function Preview({
  url,
  qrBgImgLogo = getLogoSrc(null),
  qrBgImgFillType = "contain",
  qrBgColor = "#FFFFFF",
  qrColor = "#000000",
  surveyTitle,
  isSurveyPublished = true,
  logoSize = 75,
  logoBorderRadius = 50,
  customAttrForDownloadedQrFileName = "",
}) {
  const [isLogoDownloadProcessing, setIsLogoDownloadProcessing] =
    useState(false);

  const previewContainerRef = useRef();

  const downloadQrCode = async () => {
    const element: HTMLElement = previewContainerRef.current;
    if (element) {
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
    }
  };

  return (
    <Stack className={styles["preview-download-btn-container"]}>
      <Stack
        className={styles["preview-container"]}
        ref={previewContainerRef}
        data-tagname={customAttrForDownloadedQrFileName}
      >
        <Box
          className={styles["qr-svg-bg-img-container"]}
          style={{
            width: "100%",
            height: "100%",
            backgroundColor: `${qrBgColor}`,
          }}
        >
          <Image
            className={styles["qr-bg-img"]}
            src={qrBgImgLogo}
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
          {
            <CustomQRCode
              className={styles["qr-svg"]}
              textToBeEmbedded={url}
              version={10}
              errorCorrectionLevel={"H"}
              qrColor={qrColor}
            />
          }
        </Box>
      </Stack>

      <RateupButtonBlue
        className={styles["qr-download-btn"]}
        title="Download QR Code"
        onClick={downloadQrCode}
        rightIcon={<IconDownload />}
        loading={isLogoDownloadProcessing}
        disabled={!isSurveyPublished}
      />
    </Stack>
  );
}

export default Preview;
