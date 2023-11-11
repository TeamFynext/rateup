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
import Preview from "../Preview";
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
}

const ShareQR = ({ url, sx }: ShareQRProps) => {
  const [activeTab, setActiveTab] = useState<string | null>("text");

  const [title, setTitle] = useState("QR Code");
  const [description, setDescription] = useState("Scan QR code for details.");

  const [textSize, setTextSize] = useState(20);
  const [descriptionSize, setDescriptionSize] = useState(14);

  const [textColor, setTextColor] = useState("#000");
  const [descriptionColor, setDescriptionColor] = useState("#000");
  const [backgroundColor, setBackgroundColor] = useState("skyblue");

  const [qrSize, setQRSize] = useState<number>(195);

  const [qrBgColor, setQRBgColor] = useState("#FFFFFF");

  const [logoFilter, setLogoFilter] = useState<string>("color");
  const [logoFillType, setLogoFillType] = useState<string>("fill");

  const [activeBgStyle, setActiveBgStyle] = useState("Color");
  const [gradient, setGradient] = useState({
    start: "#EAD6EE",
    end: "#ACC0FE",
  });
  const [bgImage, setBgImage] = useState(null);
  const [bgTransparency, setBgTransparency] = useState(1);

  const [file, setFile] = useState<File | null>(null);

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
        {/* //VERIFY mantine sx */}
        <Title order={4} mb="xl" pb="md">
          Generate & Share QR Code
        </Title>

        <Tabs
          value={activeTab}
          onChange={setActiveTab}
          variant="pills"
          color="gray"
          defaultValue="text"
        >
          <Group>
            <Stack justify="flex-start" style={{ minWidth: "65%" }} mb="xl">
              {/*..... QR Editor Tab titles........ */}
              <Group>
                <Tabs.List className={styles["sharqr-tab-list"]}>
                  <Tabs.Tab value="text" className={styles["SharQRTab"]}>
                    <Paper className={styles["tab-content-container"]}>
                      <Center h="100%">
                        <Stack align="center" gap="0">
                          <TextSvg className={styles["tab-icon-svg"]} />
                          <Text style={{ textAlign: "center" }}>Text</Text>
                        </Stack>
                      </Center>
                    </Paper>
                  </Tabs.Tab>
                  <Tabs.Tab value="style" className={styles["SharQRTab"]}>
                    <Paper className={styles["tab-content-container"]}>
                      <Center h="100%">
                        <Stack align="center" gap="0">
                          <BackgroundSvg className={styles["tab-icon-svg"]} />
                          <Text style={{ textAlign: "center" }}>
                            Background
                          </Text>
                        </Stack>
                      </Center>
                    </Paper>
                  </Tabs.Tab>
                  <Tabs.Tab value="logo" className={styles["SharQRTab"]}>
                    <Paper className={styles["tab-content-container"]}>
                      <Center h="100%">
                        <Stack align="center" gap="0">
                          <LogoSvg className={styles["tab-icon-svg"]} />
                          <Text style={{ textAlign: "center" }}>Logo</Text>
                        </Stack>
                      </Center>
                    </Paper>
                  </Tabs.Tab>

                  <Tabs.Tab value="template" className={styles["SharQRTab"]}>
                    <Paper className={styles["tab-content-container"]}>
                      <Center h="100%">
                        <Stack align="center" gap="0">
                          <TemplateSvg
                            className={`${styles["tab-icon-svg"]} ${styles["template-svg"]}`}
                          />
                          <Text style={{ textAlign: "center" }}>Template</Text>
                        </Stack>
                      </Center>
                    </Paper>
                  </Tabs.Tab>
                </Tabs.List>
              </Group>

              {/*..... QR Editor Tab Panes........ */}

              <Tabs.Panel value="text" style={{ minHeight: "350px" }}>
                <Title order={3} mt="xl">
                  Modify Text
                </Title>

                <Group>
                  <Stack style={{ minWidth: "40%" }} mr="lg">
                    <TextInput
                      placeholder="Enter Title Here"
                      label="Title"
                      withAsterisk
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                    <Textarea
                      mt="xl"
                      pt="xl"
                      placeholder="Enter description here"
                      label="Description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      withAsterisk
                    />
                  </Stack>

                  <Stack style={{ minWidth: "20%" }} ml="xl">
                    <Stack>
                      <Text>Title Color</Text>
                      <CustomColorPicker
                        value={textColor}
                        onChange={setTextColor}
                      />
                    </Stack>
                    <Stack>
                      <Text>Title Color</Text>
                      <Slider value={textSize} onChange={setTextSize} />
                    </Stack>

                    <Stack pt="xl">
                      <Text>Description color</Text>
                      <CustomColorPicker
                        value={descriptionColor}
                        onChange={setDescriptionColor}
                      />
                    </Stack>

                    <Stack>
                      <Text>Description color</Text>
                      <Slider
                        value={descriptionSize}
                        onChange={setDescriptionSize}
                      />
                    </Stack>
                  </Stack>
                </Group>
              </Tabs.Panel>

              <Tabs.Panel value="style" style={{ minHeight: "350px" }}>
                <StyleTab
                  backgroundColor={backgroundColor}
                  setBackgroundColor={setBackgroundColor}
                  qrSize={qrSize}
                  setQRSize={setQRSize}
                  qrBgColor={qrBgColor}
                  setQRBgColor={setQRBgColor}
                  activeBgStyle={activeBgStyle}
                  setActiveBgStyle={setActiveBgStyle}
                  gradient={gradient}
                  setGradient={setGradient}
                  bgImage={bgImage}
                  setBgImage={setBgImage}
                  bgTransparency={bgTransparency}
                  setBgTransparency={setBgTransparency}
                />
              </Tabs.Panel>

              <Tabs.Panel value="logo" style={{ minHeight: "350px" }}>
                <LogoTabpanel
                  handleLogoInputChange={handleLogoInputChange}
                  handleLogoInputFormReset={handleLogoInputFormReset}
                  removeLogo={removeLogo}
                  logoFilter={logoFilter}
                  setLogoFilter={setLogoFilter}
                  logoFillType={logoFillType}
                  setLogoFillType={setLogoFillType}
                />
              </Tabs.Panel>
              <Tabs.Panel value="template" style={{ minHeight: "350px" }}>
                text tab content
              </Tabs.Panel>
            </Stack>

            {/*..... QR Editor - Preview ........ */}

            {url && (
              <Preview
                title={title}
                description={description}
                url={url}
                textSize={textSize}
                descriptionSize={descriptionSize}
                logoFilter={logoFilter}
                logoFillType={logoFillType}
                textColor={textColor}
                descriptionColor={descriptionColor}
                backgroundColor={backgroundColor}
                qrSize={qrSize}
                qrBgColor={qrBgColor}
                logo={logoSrc}
                activeBgStyle={activeBgStyle}
                gradient={gradient}
                bgImage={bgImage}
                bgTransparency={bgTransparency}
              />
            )}
          </Group>
        </Tabs>
      </>
    </PaperLayout>
  );
};

export default ShareQR;
