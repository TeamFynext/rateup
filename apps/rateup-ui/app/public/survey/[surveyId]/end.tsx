"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

import {
  Flex,
  ScrollAreaAutosize,
  Stack,
  Title,
  useMantineTheme,
} from "@mantine/core";
import { useMediaQuery, useViewportSize } from "@mantine/hooks";
import { useExtracted } from "next-intl";
import Confetti from "react-confetti";

import { getInlineStyleFromStyleObj } from "@/components/Survey/SurveyTheme/components/previewcomponents/welcomepage";

import { CreditsCard } from "../../../../components/Card/CreditsCard";
import RateupRedirectCard from "../../../../components/Card/RateupRedirectCard";
import { getBgImgAndBgColor } from "../../../../components/Layout/TakeSurveyLayout/utils";
import BodyComp from "./BodyComp";

export default function ThankYou({
  enableGoogleReview = false,
  googleLink = "",
  reviews = [],
  kioskMode = "",
  surveyIdValue = "",
  fromShortUrl,
  redirect = null,
  surveyThemeData,
  pagesThemeData,
  titleText,
  subtitleText,
  isSurveyPreview = false,
  reviewPageLinks = null,
}) {
  const [imageLoading, setImageLoading] = useState(true);
  const [pulsing, setPulsing] = useState(true);
  const largeScreen = useMediaQuery("(min-width: 60em)");
  const isMobile = useMediaQuery("(max-width: 480px)");
  const router = useRouter();
  const translations = useExtracted();
  const searchParams = useSearchParams();
  let err = searchParams.get("err") && searchParams.get("err") === "oops";
  let k,
    sid,
    surveyId = "";
  if (fromShortUrl) {
    k = kioskMode;
    sid = surveyIdValue;
  } else {
    k = searchParams.get("k");
    sid = searchParams.get("sid");
    surveyId = searchParams.get("surveyId") as string;
  }
  const params = useParams();
  const shortId = params?.shortId;
  const { height, width } = useViewportSize();
  useEffect(() => {
    //kioskMode redirect
    if ((k === "y" || k === "cs") && !!!enableGoogleReview) {
      const timeoutId = setTimeout(() => {
        k === "cs"
          ? router.push(`/public/survey/cs`)
          : fromShortUrl
            ? router.push(`/ws/${shortId}/`)
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

  const shouldUseSurveyTheme = pagesThemeData["thankyouTheme"]?.useSurveyTheme;
  const requiredThemeObj = shouldUseSurveyTheme
    ? surveyThemeData["surveyTheme"]
    : pagesThemeData["thankyouTheme"];

  const { backgroundColor, backgroundImageSrc } = getBgImgAndBgColor(
    shouldUseSurveyTheme ? surveyThemeData : pagesThemeData,
    shouldUseSurveyTheme ? "surveyTheme" : "thankyouTheme",
    isMobile,
  );

  const titleStyles = requiredThemeObj?.title?.styles;
  let subtitleStyles = requiredThemeObj?.subtitle?.styles;
  if (!subtitleStyles) {
    subtitleStyles = {
      color: titleStyles?.color,
      fontWeight: "400",
      fontSize: 16,
      textAlign: "center",
    };
  }
  const confettiEnabled = requiredThemeObj?.confettiEnabled;

  const titleStyleNew = getInlineStyleFromStyleObj(titleStyles);
  const subtitleStylesNew = getInlineStyleFromStyleObj(subtitleStyles);

  const newTitle = subtitleText
    ? `<p style="text-align:center;"><span style="${titleStyleNew}">${titleText}</span></p><p style="text-align:center;"><span style="${subtitleStylesNew}">${subtitleText}</span></p>`
    : titleText;

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
            height: isSurveyPreview ? "100%" : "100dvh",
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
          {confettiEnabled && (
            <Confetti width={width - 1} height={height - 1} />
          )}

          {!enableGoogleReview && (
            <ScrollAreaAutosize p="sm">
              <Stack gap={"1.5rem"}>
                {!!err ? (
                  <Title
                    order={1}
                    style={{
                      ...titleStyles,
                      textAlign: "center",
                    }}
                  >
                    {translations("Thank You!")}
                  </Title>
                ) : (
                  <div
                    dangerouslySetInnerHTML={{
                      __html: newTitle,
                    }}
                    style={{ color: titleStyles?.color }}
                  />
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
              reviewPageLinks={reviewPageLinks}
            />
          )}
        </Stack>
        <div className="flex">
          {!enableGoogleReview && <RateupRedirectCard />}
        </div>
      </Flex>
    </CreditsCard>
  );
}
