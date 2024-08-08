import { useCallback, useRef } from "react";

import {
  ActionIcon,
  BackgroundImage,
  Box,
  Flex,
  Image,
  Textarea,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { IconEdit } from "@tabler/icons-react";

import { cordinateStyle } from "../../../../../../utils";
import { lexend, lexend300 } from "../../../../../../utils/fonts";
import { CreditsCard } from "../../../../../Card/CreditsCard";
import { getBgImgAndBgColor } from "../../../../../Layout/TakeSurveyLayout/utils";
import { SelectedItemEnum } from "../../../SurveyTheme.enums";
import classes from "../../../SurveyTheme.module.css";
import {
  useSelectedPreview,
  useSetOpenEditors,
  useSurveyThemeContextValue,
  useSurveyThemeStateDispatch,
} from "../../../SurveyThemeContext";

export default function WelcomePageThemeView({
  survey,
  isThemeObjBeingEditedDefaultTheme,
}) {
  const surveyTheme = useSurveyThemeContextValue();
  const surveyThemeDispatch = useSurveyThemeStateDispatch();
  const selectedPreview = useSelectedPreview();
  const isWelcomePageEnabled = survey?.welcomePageEnabled;
  const setOpenEditors = useSetOpenEditors();

  const {
    welcomeTheme,
    surveyTheme: { logo },
  } = surveyTheme;

  const {
    bg: { styles, desktopbg, mobilebg },
    button: { styles: buttonStyles, label, position },
    subtitle: { styles: subtitleStyles, subtitle },
    title: { styles: titleStyles, title },
  } = welcomeTheme;

  const orgLogoSrc = logo?.logo;
  const orgLogoStyles = logo?.styles;

  const handleTitleInputChange = useCallback(
    (e) => {
      if (!isThemeObjBeingEditedDefaultTheme)
        surveyThemeDispatch({
          type: "title-text-change",
          payload: e.target.value,
        });
    },
    [isThemeObjBeingEditedDefaultTheme],
  );

  const handleSubtitleTextareaChange = useCallback(
    (e) => {
      if (!isThemeObjBeingEditedDefaultTheme)
        surveyThemeDispatch({
          type: "subtitle-text-change",
          payload: e.target.value,
        });
    },
    [isThemeObjBeingEditedDefaultTheme],
  );

  const handleStartBtnTextChange = useCallback(
    (e) => {
      if (!isThemeObjBeingEditedDefaultTheme)
        surveyThemeDispatch({
          type: "wp-lp-start-button-text-change",
          payload: e.target.value,
        });
    },
    [isThemeObjBeingEditedDefaultTheme],
  );

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
            gap={"1.5rem"}
          >
            {orgLogoSrc && (
              <Image
                src={orgLogoSrc}
                style={{ ...orgLogoStyles, alignSelf: "center" }}
                alt="logo"
              />
            )}

            <Tooltip label="Edit title">
              <Box className={classes.titleBox} w={"50%"}>
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
                  onFocus={() => setOpenEditors(["title-styles"])}
                  autoComplete="off"
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
              <Box className={classes.titleBox} w={"50%"}>
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
                  onFocus={() => setOpenEditors(["desc-styles"])}
                  autoComplete="off"
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
                style={{ ...buttonStyles, borderRadius: "2rem" }}
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
                  onFocus={() => setOpenEditors(["button-styles"])}
                  autoComplete="off"
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
