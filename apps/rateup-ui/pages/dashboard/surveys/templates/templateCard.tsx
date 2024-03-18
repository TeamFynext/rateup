import React, { useContext } from "react";
import { produce } from "immer";
import { Flex, Stack, BackgroundImage } from "@mantine/core";
import classes from "../../../../components/Survey/SurveyTheme/SurveyTheme.module.css";
import { PreviewTypeEnum } from "../../../../components/Survey/SurveyTheme/SurveyTheme.enums";
import { getImageUrl } from "../../../../components/Survey/SurveyTheme/SurveyTheme.utils";
import { lexend300 } from "../../../../utils/fonts";
import { CreditsCard } from "../../../../components/Card/CreditsCard";

import { SurveyThemeContext } from "../../../../components/Survey/SurveyTheme/SurveyThemeContext";

export default function TemplateCard({ selectedType, setSelectedType }) {
  const { surveyTheme, setSurveyTheme, mobileOrDesktop } =
    useContext(SurveyThemeContext);
  const { welcomeTheme } = surveyTheme || {};
  function updateThemeText(key: string, value: any) {
    setSurveyTheme(
      produce((draft) => {
        draft.welcomeTheme[key] = value;
      }),
    );
  }
  const {
    bg: { styles, desktopbg, mobilebg, unsplashImage },
    // button: { styles: buttonStyles, label, position },
    // logo: { styles: logoStyles, logo },
    subtitle: { styles: subtitleStyles, subtitle },
    title: { styles: titleStyles, title },
  } = welcomeTheme;

  return (
    <Flex align={"center"} h={200} w={300} ff={lexend300.style.fontFamily}>
      <CreditsCard
        enableCredits={unsplashImage?.[mobileOrDesktop]}
        url={
          mobileOrDesktop === PreviewTypeEnum.DESKTOP
            ? encodeURI(desktopbg)
            : encodeURI(mobilebg)
        }
      >
        <BackgroundImage
          className={classes.parentContainer}
          style={{ height: "100%", width: "100%", objectFit: "fill" }}
          src={getImageUrl(
            mobileOrDesktop === PreviewTypeEnum.DESKTOP ? desktopbg : mobilebg,
            unsplashImage?.[mobileOrDesktop],
          )}
        >
          <Flex
            justify={"center"}
            align={"center"}
            h={"100%"}
            direction={"column"}
            pos={"relative"}
          >
            <Stack
              mt="lg"
              w={"80%"}
              ta={"center"}
              style={{
                fontFamily: "inherit",
                fontSize: "20px",
                ...titleStyles,
                maxWidth: "200px",
              }}
            >
              {title}
            </Stack>
            <Stack
              mt="lg"
              w={"80%"}
              ta={"center"}
              style={{
                fontFamily: "inherit",
                ...subtitleStyles,
                marginBottom: "2rem",
              }}
            >
              {subtitle}
            </Stack>
          </Flex>
        </BackgroundImage>
      </CreditsCard>
    </Flex>
  );
}
