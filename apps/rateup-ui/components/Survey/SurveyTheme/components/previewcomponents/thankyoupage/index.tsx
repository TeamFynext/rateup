import {
  ActionIcon,
  BackgroundImage,
  Box,
  Flex,
  Image,
  TextInput,
  Textarea,
  Tooltip,
} from "@mantine/core";
import { useElementSize } from "@mantine/hooks";
import { useCallback, useEffect, useRef, useState } from "react";
import Confetti from "react-confetti";
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

export default function ThankyouPageThemeView({
  isThemeObjBeingEditedDefaultTheme,
}) {
  const surveyTheme = useSurveyThemeContextValue();
  const surveyThemeDispatch = useSurveyThemeStateDispatch();
  const selectedPreview = useSelectedPreview();
  const setSelectedEditor = useSetSelectedEditor();

  const {
    thankyouTheme,
    surveyTheme: { logo },
  } = surveyTheme;
  const { ref, width, height } = useElementSize();
  const {
    bg: { styles, desktopbg, mobilebg, unsplashImage },
    subtitle: { styles: subtitleStyles, subtitle },
    title: { styles: titleStyles, title },
    confettiEnabled,
  } = thankyouTheme;

  const orgLogoSrc = logo?.logo;
  const orgLogoStyles = logo?.styles;

  const useSurveyBackground =
    surveyTheme["thankyouTheme"].bg.useSurveyBackground;
  const { backgroundColor, backgroundImageSrc } = getBgImgAndBgColor(
    surveyTheme,
    useSurveyBackground ? "surveyTheme" : "thankyouTheme",
    selectedPreview === "mobile",
  );

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

  const titleInputRef = useRef(null);
  const subtitleInputRef = useRef(null);

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
          ref={ref}
          className={classes.parentContainer}
          style={{ height: "100%", width: "100%", objectFit: "contain" }}
          src={backgroundImageSrc}
        >
          {confettiEnabled && <Confetti width={width} height={height} />}

          <form style={{ width: "100%", height: "100%" }}>
            <Flex
              justify={"center"}
              align={"center"}
              h={"100%"}
              direction={"column"}
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
                    placeholder={"Thankyou"}
                    variant="unstyled"
                    size="xxl"
                    name="headerText"
                    onClick={(e) => e.stopPropagation()}
                    styles={{
                      input: {
                        ...titleStyles,
                        height: "fit-content",
                        fontFamily: "inherit",
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
                    onChange={handleSubtitleTextareaChange}
                    value={subtitle}
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
                    mt="lg"
                    ta={"center"}
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
            </Flex>
          </form>
        </BackgroundImage>
      </CreditsCard>
    </Flex>
  );
}
