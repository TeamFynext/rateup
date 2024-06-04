import {
  ActionIcon,
  BackgroundImage,
  Box,
  Flex,
  Image,
  Overlay,
  TextInput,
  Textarea,
  Tooltip,
} from "@mantine/core";
import { useCallback, useEffect, useRef, useState } from "react";
import { cordinateStyle } from "../../../../../../utils";
import { surveyUploadsPath } from "../../../../../../utils/constants";
import { lexend, lexend300 } from "../../../../../../utils/fonts";
import { CreditsCard } from "../../../../../Card/CreditsCard";
import { PreviewTypeEnum, SelectedItemEnum } from "../../../SurveyTheme.enums";
import classes from "../../../SurveyTheme.module.css";
import {
  useSelectedPreview,
  useSetSelectedEditor,
  useSurveyThemeContextValue,
  useSurveyThemeStateDispatch,
} from "../../../SurveyThemeContext";
import { IconEdit } from "@tabler/icons-react";
import { getBgImgAndBgColor } from "../../../../../Layout/TakeSurveyLayout/utils";

export default function WelcomePageThemeView({ survey }) {
  const surveyTheme = useSurveyThemeContextValue();
  const surveyThemeDispatch = useSurveyThemeStateDispatch();
  const selectedPreview = useSelectedPreview();
  const isWelcomePageEnabled = survey?.welcomePageEnabled;
  const setSelectedEditor = useSetSelectedEditor();

  const {
    welcomeTheme,
    surveyTheme: { logo: orgLogoStylesObj },
  } = surveyTheme;

  const {
    bg: { styles, desktopbg, mobilebg },
    button: { styles: buttonStyles, label, position },
    subtitle: { styles: subtitleStyles, subtitle },
    title: { styles: titleStyles, title },
  } = welcomeTheme;

  let orgLogoStylesObject = orgLogoStylesObj;
  if (!orgLogoStylesObject) {
    orgLogoStylesObject = {
      logo: "",
      styles: {
        width: 50,
        height: 50,
      },
    };
  }
  const { logo: orgLogo, styles: orgLogoStyles } = orgLogoStylesObject;
  const [orgLogoSrc, setOrgLogoSrc] = useState("");
  useEffect(() => {
    let src = null;
    if ((orgLogo as any) instanceof File) {
      src = URL.createObjectURL(orgLogo as any);
    } else if (typeof orgLogo === "string" && orgLogo.length) {
      src = `${surveyUploadsPath}${orgLogo}`;
    }
    setOrgLogoSrc(src);
    () => {
      URL.revokeObjectURL(orgLogoSrc);
    };
  }, [orgLogo]);

  const handleTitleInputChange = useCallback((e) => {
    surveyThemeDispatch({
      type: "title-text-change",
      payload: e.target.value,
    });
  }, []);

  const handleSubtitleTextareaChange = useCallback((e) => {
    surveyThemeDispatch({
      type: "subtitle-text-change",
      payload: e.target.value,
    });
  }, []);

  const handleStartBtnTextChange = useCallback((e) => {
    surveyThemeDispatch({
      type: "wp-lp-start-button-text-change",
      payload: e.target.value,
    });
  }, []);

  const titleInputRef = useRef(null);
  const subtitleInputRef = useRef(null);
  const startBtnInputRef = useRef(null);

  const useSurveyBackground =
    surveyTheme["welcomeTheme"].bg.useSurveyBackground;
  const { backgroundColor, backgroundImageSrc } = getBgImgAndBgColor(
    surveyTheme,
    useSurveyBackground ? "surveyTheme" : "welcomeTheme",
    selectedPreview === "mobile",
  );

  return (
    <Flex
      align={"center"}
      h="100%"
      style={{ backgroundColor }}
      ff={lexend300.style.fontFamily}
    >
      {!isWelcomePageEnabled && <Overlay className={classes["overlay"]} />}
      <CreditsCard
        enableCredits={backgroundImageSrc?.startsWith(
          "https://images.unsplash.com",
        )}
        url={backgroundImageSrc}
      >
        <BackgroundImage
          className={classes.parentContainer}
          style={{ height: "100%", width: "100%", objectFit: "contain" }}
          src={backgroundImageSrc}
        >
          <Flex
            justify={"center"}
            align={"center"}
            h={"100%"}
            direction={"column"}
            pos={"relative"}
          >
            {orgLogoSrc && (
              <Image
                src={orgLogoSrc}
                style={{ ...orgLogoStyles, alignSelf: "center" }}
                alt="logo"
              />
            )}

            <Tooltip label="Edit title">
              <Box className={classes.titleBox} mt={20} w={"50%"}>
                <TextInput
                  className={lexend.className}
                  placeholder={"Welcome"}
                  variant="unstyled"
                  size="xxl"
                  name="headerText"
                  onClick={(e) => e.stopPropagation()}
                  styles={{
                    input: {
                      ...titleStyles,
                      fontFamily: "inherit",
                      height: "fit-content",
                    },
                  }}
                  value={title}
                  onChange={handleTitleInputChange}
                  ref={titleInputRef}
                  onFocus={() => setSelectedEditor(SelectedItemEnum.TITLE)}
                />

                <ActionIcon
                  variant="default"
                  radius="lg"
                  size="sm"
                  className={classes.actionIcon}
                  onClick={() => titleInputRef.current?.focus()}
                >
                  <IconEdit style={{ width: "70%", height: "70%" }} />
                </ActionIcon>
              </Box>
            </Tooltip>
            {/* //--------------------------- */}
            <Tooltip label="Edit subtitle">
              <Box className={classes.titleBox} mt={20} w={"50%"}>
                <Textarea
                  className={lexend.className}
                  placeholder={"Please fill the survey"}
                  variant="unstyled"
                  onClick={(e) => e.stopPropagation()}
                  name="descText"
                  styles={{
                    input: {
                      ...subtitleStyles,
                      fontFamily: "inherit",
                    },
                  }}
                  ta={"center"}
                  value={subtitle}
                  onChange={handleSubtitleTextareaChange}
                  ref={subtitleInputRef}
                  onFocus={() => setSelectedEditor(SelectedItemEnum.SUBTITLE)}
                />

                <ActionIcon
                  variant="default"
                  radius="lg"
                  size="sm"
                  className={classes.actionIcon}
                  onClick={() => subtitleInputRef.current?.focus()}
                >
                  <IconEdit style={{ width: "70%", height: "70%" }} />
                </ActionIcon>
              </Box>
            </Tooltip>

            <Box
              w={"50%"}
              className={classes.buttonBox}
              style={{
                display: "flex",
                ...(position?.x ? cordinateStyle(position.x) : {}),
                ...(position?.y ? cordinateStyle(position.y) : {}),
              }}
            >
              <Flex
                justify={"center"}
                p={10}
                style={buttonStyles}
                onClick={(e) => e.stopPropagation()}
              >
                <TextInput
                  onChange={handleStartBtnTextChange}
                  value={label}
                  placeholder={"Start Survey"}
                  variant="unstyled"
                  name="buttonText"
                  size="xs"
                  styles={{
                    input: {
                      color: "inherit",
                      fontSize: "18px",
                      textAlign: "center",
                      minWidth: "150px",
                      alignSelf: "center",
                      fontWeight: 600,
                      fontFamily: "inherit",
                    },
                  }}
                  ref={startBtnInputRef}
                  onFocus={() => setSelectedEditor(SelectedItemEnum.BUTTON)}
                />

                <ActionIcon
                  variant="default"
                  radius="lg"
                  size="sm"
                  className={classes.actionIcon}
                  onClick={() => startBtnInputRef.current?.focus()}
                >
                  <IconEdit style={{ width: "70%", height: "70%" }} />
                </ActionIcon>
              </Flex>
            </Box>
          </Flex>
        </BackgroundImage>
      </CreditsCard>
    </Flex>
  );
}
