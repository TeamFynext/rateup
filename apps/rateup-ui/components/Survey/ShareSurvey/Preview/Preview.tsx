import { Title, Stack, Text, Image, Box } from "@mantine/core";
import CustomQRCode from "../components/CustomQrCode/CustomQrCode";
import styles from "./Preview.module.css";
import { RateupButtonBlue } from "../../../Button/RateupButtons";
import { IconDownload } from "@tabler/icons-react";
import { useRef, useState } from "react";
import domtoimage from "dom-to-image-more";

function Preview({
  url,
  qrBgImgLogo,
  qrBgImgFillType,
  qrSize,
  qrBgColor,
  qrBgBrightness,
  qrBgContrast,
  qrColor,
  surveyTitle,
  isSurveyPublished,
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
      <Stack className={styles["preview-container"]} ref={previewContainerRef}>
        <Box
          className={styles["qr-svg-bg-img-container"]}
          style={{
            width: "100%",
            height: "100%",
          }}
        >
          <Image
            className={styles["qr-bg-img"]}
            src={qrBgImgLogo}
            alt="bg-image"
            style={{
              objectFit: qrBgImgFillType,
              backgroundColor: qrBgColor,
              filter: `contrast(${qrBgContrast}) brightness(${qrBgBrightness})`,
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
