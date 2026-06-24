import { Flex, ScrollAreaAutosize, Stack, Title } from "@mantine/core";
import { useMediaQuery, useViewportSize } from "@mantine/hooks";
import { useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { useEffect } from "react";
import Confetti from "react-confetti";
import { useTranslation } from "react-i18next";

import { CreditsCard } from "@/components/Card/CreditsCard.tsx";
import { getBgImgAndBgColor } from "@/components/Layout/TakeSurveyLayout/utils.ts";
import { getInlineStyleFromStyleObj } from "@/components/Survey/SurveyTheme/components/previewcomponents/welcomepage/index.tsx";

import BodyComp from "./BodyComp.tsx";

export default function ThankYou({
  enableGoogleReview = false,
  googleLink = "",
  reviews = [],
  kioskMode = "",
  surveyIdValue: _surveyIdValue = "",
  fromShortUrl,
  redirect = null,
  surveyThemeData,
  pagesThemeData,
  titleText,
  subtitleText,
  isSurveyPreview = false,
  reviewPageLinks = null,
}) {
  const isMobile = useMediaQuery("(max-width: 480px)");
  const navigate = useNavigate();
  const { t: translations } = useTranslation();
  const searchParams = useSearch({ strict: false });
  const err = searchParams.err && searchParams.err === "oops";
  let k,
    surveyId = "";
  if (fromShortUrl) {
    k = kioskMode;
  } else {
    k = searchParams.k;
    surveyId = searchParams.surveyId as string;
  }
  const params = useParams({
    strict: false,
  });
  const shortId = params?.shortId;
  const { height, width } = useViewportSize();
  useEffect(() => {
    // kioskMode redirect
    if ((k === "y" || k === "cs") && !enableGoogleReview) {
      const timeoutId = setTimeout(() => {
        if (k === "cs") {
          navigate({
            to: `/public/survey/cs`,
          });
        } else if (fromShortUrl) {
          navigate({
            to: `/ws/${shortId}/`,
          });
        } else {
          navigate({
            to: `/public/survey/${surveyId}`,
          });
        }
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
          if (redirect.url === "/")
            navigate({
              to: redirect.url,
            });
          else if (redirect.url?.startsWith("http:") || redirect.url?.startsWith("https:")) {
            navigate({
              to: redirect.url,
            });
          } else {
            navigate({
              to: `https://${redirect.url}`,
            });
          }
        },
        (redirect.time ?? 1) * 1000,
      );
    }
    return () => clearTimeout(timeout);
  }, [redirect, kioskMode, navigate]);

  const enableBody = k === "cs" || enableGoogleReview;

  const orgLogoSrc = surveyThemeData?.surveyTheme.logo?.logo;

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
      enableCredits={backgroundImageSrc?.startsWith("https://images.unsplash.com")}
      url={backgroundImageSrc}
    >
      <Flex
        style={{
          ...surveyThemeData?.thankyouTheme?.bg?.styles,
          height: isSurveyPreview ? "100%" : "100dvh",
          backgroundColor,
          backgroundImage: `url(${backgroundImageSrc})`,
          backgroundRepeat: "no-repeat",
          backgroundSize: "cover",
          backgroundPosition: "center",
          padding: "1.25rem",
          paddingBottom: 0,
          overflow: "hidden",
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
          {confettiEnabled && <Confetti width={width - 1} height={height - 1} />}

          {!enableGoogleReview && (
            <ScrollAreaAutosize p="sm">
              <Stack gap={"1.5rem"}>
                {err ? (
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
        <div className="flex">{/* {!enableGoogleReview && <RateupRedirectCard />} */}</div>
      </Flex>
    </CreditsCard>
  );
}
