import { BackgroundImage, Flex, Stack } from "@mantine/core";
import { CreditsCard } from "../../../../components/Card/CreditsCard";
import { PreviewTypeEnum } from "../../../../components/Survey/SurveyTheme/SurveyTheme.enums";
import classes from "../../../../components/Survey/SurveyTheme/SurveyTheme.module.css";
import { getImageUrl } from "../../../../components/Survey/SurveyTheme/SurveyTheme.utils";
import {
  useSelectedPreview,
  useSurveyThemeContextValue,
} from "../../../../components/Survey/SurveyTheme/SurveyThemeContext";
import { lexend300 } from "../../../../utils/fonts";
import { getBgImgAndBgColor } from "../../../../components/Layout/TakeSurveyLayout/utils";

export default function TemplateCard() {
  const surveyTheme = useSurveyThemeContextValue();
  const selectedPreview = useSelectedPreview();

  const { welcomeTheme } = surveyTheme || {};

  const {
    bg: { useSurveyBackground },
    // button: { styles: buttonStyles, label, position },
    // logo: { styles: logoStyles, logo },
    subtitle: { styles: subtitleStyles, subtitle },
    title: { styles: titleStyles, title },
  } = surveyTheme.welcomeTheme;

  const { backgroundColor, backgroundImageSrc } = getBgImgAndBgColor(
    surveyTheme,
    useSurveyBackground ? "surveyTheme" : "welcomeTheme",
    selectedPreview === "mobile",
  );

  return (
    <Flex
      align={"center"}
      h={200}
      w={300}
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
              {subtitle.split(" ").slice(0, 10).join(" ")}{" "}
              {subtitle.split(" ").length > 10 && "..."}
            </Stack>
          </Flex>
        </BackgroundImage>
      </CreditsCard>
    </Flex>
  );
}
