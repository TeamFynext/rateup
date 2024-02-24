import {
  Flex,
  Group,
  Image,
  Stack,
  Text,
  Title,
  useMantineTheme,
} from "@mantine/core";
import { useMediaQuery, useViewportSize } from "@mantine/hooks";
import { IconCircleCheck, IconHome } from "@tabler/icons-react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect } from "react";
import Confetti from "react-confetti";
import { useSurveyTheme } from "../../../../backend/surveyTheme/surveyTheme.query";
import { getPublicSurveyGoogleLink } from "../../../../backend/surveys/survey.api";
import { getPublicReviewsBySurveyTeamMapId } from "../../../../backend/team/reviewSuggestion/reviewSuggestion.api";
import { RateupButtonBlue } from "../../../../components/Button/RateupButtons";
import { CreditsCard } from "../../../../components/Card/CreditsCard";
import RateupRedirectCard from "../../../../components/Card/RateupRedirectCard";
import { getImageUrl } from "../../../../components/Survey/SurveyTheme/SurveyTheme.utils";
import { SurveyTheme } from "../../../../components/Survey/SurveyTheme/surveyTheme.types";
import GoogleReview from "../../../../components/Survey/TakeSurvey/GoogleReview";
import CenteredSpinner from "../../../../components/Loaders/CenteredSpinner";
export async function getServerSideProps(context) {
  const { surveyId } = context.params;
  const { msg } = context.query;

  let propsToPass: any = { enableGoogleReview: false };
  if (msg == "thanks") {
    const [googleLink, reviews] = await Promise.all([
      getPublicSurveyGoogleLink(surveyId),
      getPublicReviewsBySurveyTeamMapId(surveyId),
    ]);
    propsToPass.googleLink = googleLink;
    propsToPass.reviews = reviews;
    if (googleLink) propsToPass.enableGoogleReview = true;
  }
  return {
    props: propsToPass,
  };
}

export default function ThankYou({ enableGoogleReview, googleLink, reviews }) {
  const largeScreen = useMediaQuery("(min-width: 60em)");
  const isMobile = useMediaQuery("(max-width: 480px)");
  const router = useRouter();
  const { k, sid } = router.query as { k: string; sid: string }; //kioskMode
  const { surveyId } = router.query as { surveyId: string }; // TODO: rename to surveyTeamMapId
  const { height, width } = useViewportSize();
  useEffect(() => {
    //kioskMode redirect
    if ((k === "y" || k === "cs") && !!!enableGoogleReview) {
      const timeoutId = setTimeout(() => {
        k === "cs"
          ? router.push(`/public/survey/cs`)
          : router.push(`/public/survey/${surveyId}`);
      }, 5000);

      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [k]);
  const { data: surveyThemeData, isLoading } = useSurveyTheme(sid) as {
    data: SurveyTheme;
    isLoading: boolean;
  };
  const theme = useMantineTheme();
  const enableBody = k === "cs" || enableGoogleReview;
  if (isLoading) return <CenteredSpinner h={"100dvh"} />;
  return (
    <CreditsCard
      enableCredits={
        isMobile
          ? surveyThemeData?.thankyouTheme?.bg?.unsplashImage?.mobile
          : surveyThemeData?.thankyouTheme?.bg?.unsplashImage?.desktop
      }
      url={
        isMobile && surveyThemeData?.thankyouTheme?.bg?.mobilebg
          ? surveyThemeData?.thankyouTheme?.bg?.mobilebg
          : surveyThemeData?.thankyouTheme?.bg?.desktopbg
      }
    >
      <Flex
        style={{
          ...surveyThemeData?.thankyouTheme?.bg?.styles,
          ...{
            height: "100dvh",
            backgroundColor: surveyThemeData?.thankyouTheme?.bg?.styles
              ?.backgroundColor
              ? surveyThemeData?.thankyouTheme?.bg?.styles?.backgroundColor
              : theme.colors[theme.primaryColor][6],
            backgroundImage:
              surveyThemeData?.thankyouTheme?.bg?.desktopbg ||
              surveyThemeData?.thankyouTheme?.bg?.mobilebg
                ? `url(${getImageUrl(
                    isMobile
                      ? surveyThemeData?.thankyouTheme?.bg?.mobilebg
                      : surveyThemeData?.thankyouTheme?.bg?.desktopbg,
                    isMobile
                      ? surveyThemeData?.thankyouTheme?.bg?.unsplashImage
                          ?.mobile
                      : surveyThemeData?.thankyouTheme?.bg?.unsplashImage
                          ?.desktop,
                  )})`
                : "",
            backgroundRepeat: "no-repeat",
            backgroundSize: "cover",
            backgroundPosition: "center",
          },
        }}
        direction={"column"}
        justify={"center"}
      >
        <Stack h="100%" w="100%">
          {surveyThemeData?.thankyouTheme?.confettiEnabled && (
            <Confetti width={width - 1} height={height - 1} />
          )}
          {!enableGoogleReview && (
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
              {surveyThemeData?.thankyouTheme?.logo?.logo ? (
                <Image
                  src={getImageUrl(surveyThemeData?.thankyouTheme?.logo?.logo)}
                  alt="Rateup"
                  height={"auto"}
                  style={surveyThemeData?.thankyouTheme?.logo?.styles}
                />
              ) : (
                <IconCircleCheck
                  size={"3rem"}
                  style={surveyThemeData?.thankyouTheme?.logo?.styles}
                  color={
                    surveyThemeData?.thankyouTheme?.title?.styles?.color ??
                    "#fff"
                  }
                />
              )}
              <Title
                order={1}
                fw={400}
                style={{
                  ...surveyThemeData?.thankyouTheme?.subtitle?.styles,
                  ...{ fontSize: largeScreen ? "3rem" : "1.25rem" },
                }}
              >
                {surveyThemeData?.thankyouTheme?.title?.title}
              </Title>
              {surveyThemeData?.thankyouTheme?.subtitle?.subtitle && (
                <Text style={surveyThemeData?.thankyouTheme?.subtitle?.styles}>
                  {surveyThemeData?.thankyouTheme?.subtitle?.subtitle}
                </Text>
              )}
            </Stack>
          )}
          {enableBody && (
            <Stack
              align="center"
              justify="center"
              gap="xl"
              style={{
                flex: 1,
                borderRadius: "28px 28px 0px 0px",
                backgroundColor: "whitesmoke",
              }}
            >
              {enableGoogleReview && (
                <GoogleReview
                  googleLink={googleLink}
                  reviewSuggestions={reviews}
                  orgLogoUrl={surveyThemeData?.thankyouTheme?.logo?.logo}
                />
              )}

              {k === "cs" && (
                <Group m="xl" p="xl">
                  <Link
                    href={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/public/survey/cs`}
                    target="_blank"
                  >
                    <RateupButtonBlue
                      leftIcon={<IconHome />}
                      title="Go to Home"
                    />
                  </Link>
                </Group>
              )}
            </Stack>
          )}
        </Stack>
        {!enableGoogleReview && <RateupRedirectCard />}
      </Flex>
    </CreditsCard>
  );
}
