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
import { defaultTheme } from "../../../../components/Survey/SurveyTheme/defaultTheme";
import { SurveyTheme } from "../../../../components/Survey/SurveyTheme/surveyTheme.types";
import GoogleReview from "../../../../components/Survey/TakeSurvey/GoogleReview";
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
  if (isLoading) return <div>Loading...</div>;
  const { thankyouTheme } = surveyThemeData || (defaultTheme as SurveyTheme);

  const {
    bg: { styles: bgStyles },
    logo: { logo, styles: logoStyles },
    subtitle: { subtitle, styles: subtitleStyles },
    title: { title, styles: titleStyles },
    confettiEnabled,
  } = thankyouTheme;

  return (
    <CreditsCard
      enableCredits={
        isMobile
          ? thankyouTheme?.bg?.unsplashImage?.mobile
          : thankyouTheme?.bg?.unsplashImage?.desktop
      }
      url={
        isMobile && thankyouTheme?.bg?.mobilebg
          ? thankyouTheme?.bg?.mobilebg
          : thankyouTheme?.bg?.desktopbg
      }
    >
      <Flex
        style={{
          ...bgStyles,
          ...{
            height: "100dvh",
            backgroundColor: bgStyles?.backgroundColor
              ? bgStyles?.backgroundColor
              : theme.colors[theme.primaryColor][6],
            backgroundImage:
              thankyouTheme?.bg?.desktopbg || thankyouTheme?.bg?.mobilebg
                ? `url(${getImageUrl(
                    isMobile
                      ? thankyouTheme?.bg?.mobilebg
                      : thankyouTheme?.bg?.desktopbg,
                    isMobile
                      ? thankyouTheme?.bg?.unsplashImage?.mobile
                      : thankyouTheme?.bg?.unsplashImage?.desktop,
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
          {confettiEnabled && (
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
              {logo ? (
                <Image
                  src={getImageUrl(logo)}
                  alt="Rateup"
                  height={"auto"}
                  style={logoStyles}
                />
              ) : (
                <IconCircleCheck
                  size={"3rem"}
                  style={logoStyles}
                  color={titleStyles?.color ?? "#fff"}
                />
              )}
              <Title
                order={1}
                fw={400}
                style={{
                  ...titleStyles,
                  ...{ fontSize: largeScreen ? "3rem" : "1.25rem" },
                }}
              >
                {title}
              </Title>
              {subtitle && <Text style={subtitleStyles}>{subtitle}</Text>}
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
                  orgLogoUrl={logo}
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
