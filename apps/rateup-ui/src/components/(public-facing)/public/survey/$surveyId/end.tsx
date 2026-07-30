import { useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import Confetti from "react-confetti";
import { useTranslation } from "react-i18next";

import { CreditsCard } from "@/components/Card/CreditsCard.tsx";
import { getBgImgAndBgColor } from "@/components/Layout/TakeSurveyLayout/utils.ts";
import { getInlineStyleFromStyleObj } from "@/components/Survey/SurveyTheme/components/previewcomponents/welcomepage/index.tsx";
import type { SurveyTheme } from "@/context/SurveyThemeContext.tsx";
import { useMediaQuery } from "@/hooks/use-media-query.ts";
import type { ReviewSuggestion } from "@/types/global";

import BodyComp from "./BodyComp.tsx";

function useViewportSize() {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const setViewportSize = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", setViewportSize);
    window.addEventListener("orientationchange", setViewportSize);
    setViewportSize();
    return () => {
      window.removeEventListener("resize", setViewportSize);
      window.removeEventListener("orientationchange", setViewportSize);
    };
  }, []);
  return size;
}

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
}: {
  enableGoogleReview?: boolean;
  googleLink?: string;
  reviews?: ReviewSuggestion[];
  kioskMode?: string;
  surveyIdValue?: string;
  fromShortUrl?: boolean;
  redirect?: { enable?: boolean; url?: string; time?: string | number } | null;
  surveyThemeData?: SurveyTheme | null;
  pagesThemeData?: SurveyTheme | null;
  titleText?: string;
  subtitleText?: string;
  isSurveyPreview?: boolean;
  reviewPageLinks?: Survey["reviewPageLinks"] | null;
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
    let timeout: ReturnType<typeof setTimeout> | null = null;
    if (kioskMode === "n" && redirect && (redirect?.enable ?? false)) {
      timeout = setTimeout(
        () => {
          if (redirect.url === "/")
            navigate({
              to: redirect.url,
            });
          else if (redirect.url?.startsWith("http:") || redirect.url?.startsWith("https:")) {
            navigate({
              to: redirect.url!,
            });
          } else {
            navigate({
              to: `https://${redirect.url}`,
            });
          }
        },
        Number(redirect.time ?? 1) * 1000,
      );
    }
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [redirect, kioskMode, navigate]);

  const enableBody = k === "cs" || enableGoogleReview;

  const orgLogoSrc = surveyThemeData?.surveyTheme?.logo?.logo;

  const shouldUseSurveyTheme = pagesThemeData?.["thankyouTheme"]?.useSurveyTheme;
  const requiredThemeObj = shouldUseSurveyTheme
    ? surveyThemeData?.["surveyTheme"]
    : pagesThemeData?.["thankyouTheme"];

  const { backgroundColor, backgroundImageSrc } = getBgImgAndBgColor(
    shouldUseSurveyTheme ? (surveyThemeData ?? null) : (pagesThemeData ?? null),
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
      enableCredits={!!backgroundImageSrc?.startsWith("https://images.unsplash.com")}
      url={backgroundImageSrc}
    >
      <div
        className="flex flex-col items-center justify-center overflow-hidden"
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
        }}
      >
        <div
          className="flex flex-1 flex-col justify-center overflow-hidden"
          style={{ maxWidth: 1920, minHeight: 100 }}
        >
          {confettiEnabled && <Confetti width={width - 1} height={height - 1} />}

          {!enableGoogleReview && (
            <div className="overflow-auto p-3">
              <div className="flex flex-col gap-6">
                {err ? (
                  <h1
                    style={{
                      ...titleStyles,
                      textAlign: "center",
                    }}
                  >
                    {translations("Thank You!")}
                  </h1>
                ) : (
                  <div
                    dangerouslySetInnerHTML={{
                      __html: newTitle ?? "",
                    }}
                    style={{ color: titleStyles?.color }}
                  />
                )}
              </div>
            </div>
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
        </div>
        <div className="flex">{/* {!enableGoogleReview && <RateupRedirectCard />} */}</div>
      </div>
    </CreditsCard>
  );
}
