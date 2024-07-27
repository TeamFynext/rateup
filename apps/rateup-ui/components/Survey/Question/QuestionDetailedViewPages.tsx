import { useState } from "react";

import { BackgroundImage, Flex, Stack, Text, Title } from "@mantine/core";

import { PageType } from "@/types/enums";
import { CreditsCard } from "@/components/Card/CreditsCard";
import RateupRedirectCard from "@/components/Card/RateupRedirectCard";
import { getBgImgAndBgColor } from "@/components/Layout/TakeSurveyLayout/utils";
import WelcomePage from "@/components/Layout/WelcomePage/WelcomePage";

import PreviewDeviceSelector from "../SurveyTheme/components/PreviewDeviceSelector";
import { PreviewTypeEnum } from "../SurveyTheme/SurveyTheme.enums";
import styles from "./QuestionDetailedViewPages.module.css";

function WelcomeOrThankyouPage({ questionType, survey }) {
  const [previewDeviceSelectorState, setPreviewDeviceSelectorState] = useState(
    PreviewTypeEnum.DESKTOP,
  );

  const { theme: surveyThemeData } = survey?.webSurveyTheme;
  const orgLogoSrc = surveyThemeData.surveyTheme?.logo?.logo;
  const orgLogoStyles = surveyThemeData.surveyTheme?.logo?.styles;

  const isMobile = previewDeviceSelectorState === PreviewTypeEnum.MOBILE;

  let requiredSurveyThemeObjKey = "surveyTheme";
  const useSurveyBackgroundValueForWelcomeTheme =
    surveyThemeData["welcomeTheme"].bg.useSurveyBackground;
  const useSurveyBackgroundValueForThankyouTheme =
    surveyThemeData["thankyouTheme"].bg.useSurveyBackground;
  if (
    questionType === PageType.Welcome &&
    !useSurveyBackgroundValueForWelcomeTheme
  )
    requiredSurveyThemeObjKey = "welcomeTheme";
  if (
    questionType === PageType.ThankYou &&
    !useSurveyBackgroundValueForThankyouTheme
  )
    requiredSurveyThemeObjKey = "thankyouTheme";

  const { backgroundColor, backgroundImageSrc } = getBgImgAndBgColor(
    surveyThemeData,
    requiredSurveyThemeObjKey,
    isMobile,
  );
  const isUnsplashImage = backgroundImageSrc?.startsWith(
    "https://images.unsplash.com",
  );

  let componentToBeRendered = null;

  if (questionType === PageType.Welcome) {
    componentToBeRendered = (
      <WelcomePage
        surveyThemeData={surveyThemeData?.welcomeTheme}
        orgLogoSrc={orgLogoSrc}
        orgLogoStyles={orgLogoStyles}
        onStart={() => {}}
        largeScreen={true}
      />
    );
  } else if (questionType === PageType.ThankYou) {
    componentToBeRendered = (
      <Stack
        align="center"
        justify="center"
        p="sm"
        m={"auto"}
        h={"100%"}
        style={{
          flex: 0,
        }}
      >
        <Title
          order={1}
          style={{
            ...surveyThemeData?.thankyouTheme?.title?.styles,
          }}
        >
          {surveyThemeData?.thankyouTheme?.title?.title}
        </Title>
        <Text style={surveyThemeData?.thankyouTheme?.subtitle?.styles}>
          {surveyThemeData?.thankyouTheme?.subtitle?.subtitle}
        </Text>
      </Stack>
    );
  }

  return (
    <Flex className={styles["question-detailed-view-pages-root-div"]}>
      <PreviewDeviceSelector
        value={previewDeviceSelectorState}
        onChange={setPreviewDeviceSelectorState}
        withLabel={false}
        className={styles["preview-device-selector"]}
      />
      {questionType === PageType.ThankYou && (
        <RateupRedirectCard
          className={styles["thankyou-page-powered-by-rateup-div"]}
        />
      )}
      <Flex
        className={styles["question-detailed-view-pages-wrapper"]}
        style={{ backgroundColor, width: isMobile ? 400 : "100%" }}
      >
        <CreditsCard enableCredits={isUnsplashImage} url={backgroundImageSrc}>
          <BackgroundImage
            // mih={"100dvh"}
            h={"100%"}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              objectFit: "contain",
              borderRadius: "1rem",
            }}
            src={backgroundImageSrc}
          >
            {componentToBeRendered}
          </BackgroundImage>
        </CreditsCard>
      </Flex>
    </Flex>
  );
}

export default WelcomeOrThankyouPage;
