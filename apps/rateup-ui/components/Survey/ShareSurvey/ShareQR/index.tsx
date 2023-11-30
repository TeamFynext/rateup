import {
  Paper,
  Text,
  Center,
  Stack,
  Group,
  TextInput,
  Title,
  Tabs,
  Textarea,
  Slider,
} from "@mantine/core";
import React, { useState, useEffect, useCallback } from "react";
import Preview from "../Preview/Preview";
import StyleTab from "../QRtabs/StyleTab";
import PaperLayout from "../../../styled/Layouts/PaperLayout";
import LogoTabpanel from "./LogoTabPanel";
import CustomColorPicker from "../components/CustomColorPicker";
import TemplateSvg from "./svg-icons-components/TemplateSvg";
import LogoSvg from "./svg-icons-components/LogoSvg";
import BackgroundSvg from "./svg-icons-components/BackgroundSvg";
import TextSvg from "./svg-icons-components/TextSvg";
import styles from "./ShareQR.module.css";

interface ShareQRProps {
  url: string;
  sx?: any;
  surveyTitle?: string;
  isSurveyPublished?: boolean;
}

const ShareQR = ({ url, sx, surveyTitle, isSurveyPublished }: ShareQRProps) => {
  const [activeTab, setActiveTab] = useState<string | null>("text");

  const [qrSize, setQRSize] = useState<number>(250);

  const [qrBgColor, setQRBgColor] = useState("#FFFFFF");

  const [qrColor, setQRColor] = useState("#000000");

  const [logoFillType, setLogoFillType] = useState<string>("contain");

  const [qrBgBrightness, setQRBgBrightness] = useState(1);
  const [qrBgContrast, setQRBgContrast] = useState(1);

  const [logoSrc, setLogoSrc] = useState("/images/rateup-star.svg");

  useEffect(() => {
    //For server upload - template setup
    // const uploadAndUpdate = async () => {
    //   if (file) {
    //     notifications.show({
    //       id: "load-data",
    //       loading: true,
    //       title: "Uploading image",
    //       message: `Hold on, uploading your image in progress`,
    //       autoClose: false,
    //       withCloseButton: false,
    //     });
    //     const fileKey = await uploadFile(file);
    //     if (typeof fileKey === "string") {
    //       setLogoSrc(fileKey)
    //     }
    //   }
    // };
    // uploadAndUpdate();
  }, []);

  const removeLogo = useCallback(
    function () {
      setLogoSrc("/images/rateup-star.svg");
    },
    [logoSrc],
  );

  const handleLogoInputFormReset = useCallback(() => {
    removeLogo();
  }, [removeLogo]);

  const handleLogoInputChange = useCallback(
    (e) => {
      const filesArray = e.target.files;
      if (filesArray.length) {
        const reader = new FileReader();
        reader.addEventListener(
          "load",
          function () {
            const url = reader.result.toString();
            setLogoSrc(url);
          },
          false,
        );
        reader.readAsDataURL(filesArray[0]);
      } else {
        removeLogo();
      }
    },
    [removeLogo],
  );

  return (
    <PaperLayout shadow="sm" p="xl" style={{ ...sx }}>
      <>
        <Title order={1} mb="sm" pb="md" className={styles["heading"]}>
          Generate & Share QR Code
        </Title>

        <Tabs
          value={activeTab}
          onChange={setActiveTab}
          variant="pills"
          color="gray"
          defaultValue="text"
        >
          <Group className={styles["options-preview-container"]}>
            <LogoTabpanel
              handleLogoInputChange={handleLogoInputChange}
              handleLogoInputFormReset={handleLogoInputFormReset}
              removeLogo={removeLogo}
              qrBgBrightness={qrBgBrightness}
              setQRBgBrightness={setQRBgBrightness}
              qrBgContrast={qrBgContrast}
              setQRBgContrast={setQRBgContrast}
              logoFillType={logoFillType}
              setLogoFillType={setLogoFillType}
              qrBgColor={qrBgColor}
              setQRBgColor={setQRBgColor}
              qrColor={qrColor}
              setQRColor={setQRColor}
            />

            {/*..... QR Editor - Preview ........ */}

            {url && (
              <Preview
                url={url}
                qrBgImgLogo={logoSrc}
                qrBgImgFillType={logoFillType}
                qrSize={qrSize}
                qrBgColor={qrBgColor}
                qrBgBrightness={qrBgBrightness}
                qrBgContrast={qrBgContrast}
                qrColor={qrColor}
                surveyTitle={surveyTitle}
                isSurveyPublished={isSurveyPublished}
              />
            )}
          </Group>
        </Tabs>
      </>
    </PaperLayout>
  );
};

export default ShareQR;
