import { useEffect, useState } from "react";
import { useRouter } from "next/router";

import {
  Flex,
  ScrollAreaAutosize,
  Stack,
  Text,
  Title,
  useMantineTheme,
} from "@mantine/core";
import { useMediaQuery, useViewportSize } from "@mantine/hooks";
import Confetti from "react-confetti";

import { PageType } from "@/types/enums";

import {
  getPublicSurvey,
  getPublicSurveyGoogleLink,
} from "../../../../backend/surveys/survey.api";
import { getPublicReviewsBySurveyTeamMapId } from "../../../../backend/team/reviewSuggestion/reviewSuggestion.api";
import { CreditsCard } from "../../../../components/Card/CreditsCard";
import RateupRedirectCard from "../../../../components/Card/RateupRedirectCard";
import { getBgImgAndBgColor } from "../../../../components/Layout/TakeSurveyLayout/utils";
import BodyComp from "./BodyComp";

export async function getServerSideProps(context) {
  const { surveyId } = context.params;
  const { msg, language } = context.query;

  let propsToPass: any = {
    enableGoogleReview: false,
  };

  const defaultTitleSubtitleTexts = {
    titleText: "Thank you",
    subtitleText: "Thank you for taking the survey",
  };

  if (msg == "thanks") {
    const [googleLink, reviews, survey] = await Promise.all([
      getPublicSurveyGoogleLink(surveyId),
      getPublicReviewsBySurveyTeamMapId(surveyId, language),
      getPublicSurvey(surveyId),
    ]);
    const questions = survey.questions;
    const thankyouPageTypeObj =
      questions?.find(
        (questionObj) => questionObj.type === PageType.ThankYou,
      ) || defaultTitleSubtitleTexts;
    propsToPass.googleLink = googleLink;
    propsToPass.reviews = reviews;
    if (googleLink) propsToPass.enableGoogleReview = true;
    if (survey) {
      propsToPass.redirect = survey.redirect;
      propsToPass.kioskMode = survey.kioskMode ? "y" : "n";
      // @ts-ignore
      propsToPass.surveyThemeData = survey?.webSurveyTheme?.theme;
      propsToPass.titleText = thankyouPageTypeObj.titleText;
      propsToPass.subtitleText = thankyouPageTypeObj.subtitleText;
    }
  } else {
    const survey = await getPublicSurvey(surveyId);
    const questions = survey.questions;
    const thankyouPageTypeObj =
      questions?.find(
        (questionObj) => questionObj.type === PageType.ThankYou,
      ) || defaultTitleSubtitleTexts;
    if (survey) {
      propsToPass.redirect = survey.redirect;
      propsToPass.kioskMode = survey.kioskMode ? "y" : "n";
      // @ts-ignore
      propsToPass.surveyThemeData = survey?.webSurveyTheme?.theme;
      propsToPass.titleText = thankyouPageTypeObj.titleText;
      propsToPass.subtitleText = thankyouPageTypeObj.subtitleText;
    }
  }
  return {
    props: propsToPass,
  };
}

export default function ThankYou({
  enableGoogleReview = false,
  googleLink = "",
  reviews = [],
  kioskMode,
  surveyIdValue,
  fromShortUrl,
  redirect = null,
  surveyThemeData,
  titleText,
  subtitleText,
}) {
  const [imageLoading, setImageLoading] = useState(true);
  const [pulsing, setPulsing] = useState(true);
  const largeScreen = useMediaQuery("(min-width: 60em)");
  const isMobile = useMediaQuery("(max-width: 480px)");
  const router = useRouter();

  // const { k, sid } = router.query as { k: string; sid: string }; //kioskMode
  // const { surveyId } = router.query as { surveyId: string }; // TODO: rename to surveyTeamMapId
  let err = router.query.err && router.query.err === "oops";
  let k,
    sid,
    surveyId = "";
  if (fromShortUrl) {
    k = kioskMode;
    sid = surveyIdValue;
  } else {
    k = router.query.k; //kioskMode
    sid = router.query.sid;
    surveyId = router.query.surveyId as string;
  }

  const { height, width } = useViewportSize();
  useEffect(() => {
    //kioskMode redirect
    if ((k === "y" || k === "cs") && !!!enableGoogleReview) {
      const timeoutId = setTimeout(() => {
        k === "cs"
          ? router.push(`/public/survey/cs`)
          : fromShortUrl
            ? router.push(`/ws/${router.query.shortId}/`)
            : router.push(`/public/survey/${surveyId}`);
      }, 5000);

      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [k]);

  useEffect(() => {
    let timeout = null;
    if (kioskMode === "n" && redirect && (redirect?.enable ?? false)) {
      timeout = setTimeout(
        () => {
          if (redirect.url === "/") router.push(redirect.url);
          else if (
            redirect.url?.startsWith("http:") ||
            redirect.url?.startsWith("https:")
          ) {
            router.push(redirect.url);
          } else {
            router.push(`https://${redirect.url}`);
          }
        },
        (redirect.time ?? 1) * 1000,
      );
    }
    return () => clearTimeout(timeout);
  }, [redirect, kioskMode, router]);

  const theme = useMantineTheme();
  const enableBody = k === "cs" || enableGoogleReview;

  const orgLogoSrc = surveyThemeData?.surveyTheme.logo?.logo;
  const orgLogoStyles = surveyThemeData?.surveyTheme.logo?.styles;

  const imageLoaded = () => {
    setImageLoading(false);
    setTimeout(() => setPulsing(false), 600);
  };

  const useSurveyBackground =
    surveyThemeData["thankyouTheme"].bg.useSurveyBackground;

  const { backgroundColor, backgroundImageSrc } = getBgImgAndBgColor(
    surveyThemeData,
    useSurveyBackground ? "surveyTheme" : "thankyouTheme",
    isMobile,
  );

  return (
    <CreditsCard
      enableCredits={backgroundImageSrc?.startsWith(
        "https://images.unsplash.com",
      )}
      url={backgroundImageSrc}
    >
      <Flex
        style={{
          ...surveyThemeData?.thankyouTheme?.bg?.styles,
          ...{
            height: "100dvh",
            backgroundColor: backgroundColor,
            backgroundImage: `url(${backgroundImageSrc})`,
            backgroundRepeat: "no-repeat",
            backgroundSize: "cover",
            backgroundPosition: "center",
            padding: "1.25rem",
            paddingBottom: 0,
            overflow: "hidden",
          },
        }}
        direction={"column"}
        justify={"center"}
        align={"center"}
      >
        <Stack
          maw={1920}
          mih={100}
          flex={1}
          justify="center"
          style={{
            overflow: "hidden",
          }}
        >
          {surveyThemeData?.thankyouTheme?.confettiEnabled && (
            <Confetti width={width - 1} height={height - 1} />
          )}

          {!enableGoogleReview && (
            <ScrollAreaAutosize p="sm">
              <Stack gap={"1.5rem"}>
                <Title
                  order={1}
                  style={{
                    ...surveyThemeData?.thankyouTheme?.title?.styles,
                  }}
                >
                  {!!err ? "Thank You!" : titleText}
                </Title>
                {(surveyThemeData?.thankyouTheme?.subtitle?.subtitle ||
                  err) && (
                  <Text
                    style={surveyThemeData?.thankyouTheme?.subtitle?.styles}
                  >
                    {!!err
                      ? "You've already submitted a response earlier."
                      : subtitleText}
                  </Text>
                )}
              </Stack>
            </ScrollAreaAutosize>
          )}
          {enableBody && (
            <BodyComp
              k={k}
              enableGoogleReview={enableGoogleReview}
              googleLink={googleLink}
              reviews={reviews}
              orgLogoSrc={orgLogoSrc}
              surveyId={surveyId}
            />
          )}
        </Stack>
        <Flex>{!enableGoogleReview && <RateupRedirectCard />}</Flex>
      </Flex>
    </CreditsCard>
  );
}
