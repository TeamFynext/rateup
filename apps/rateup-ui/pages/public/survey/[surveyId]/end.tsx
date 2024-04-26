import {
  Center,
  Flex,
  Group,
  Image,
  List,
  Modal,
  Stack,
  Text,
  Title,
  useMantineTheme,
} from "@mantine/core";
import { useDisclosure, useMediaQuery, useViewportSize } from "@mantine/hooks";
import { IconCircleCheck, IconHome } from "@tabler/icons-react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Confetti from "react-confetti";
import { useSurveyTheme } from "../../../../backend/surveyTheme/surveyTheme.query";
import {
  getPublicSurvey,
  getPublicSurveyGoogleLink,
} from "../../../../backend/surveys/survey.api";
import { getPublicReviewsBySurveyTeamMapId } from "../../../../backend/team/reviewSuggestion/reviewSuggestion.api";
import { RateupButtonBlue } from "../../../../components/Button/RateupButtons";
import { CreditsCard } from "../../../../components/Card/CreditsCard";
import RateupRedirectCard from "../../../../components/Card/RateupRedirectCard";
import { getImageUrl } from "../../../../components/Survey/SurveyTheme/SurveyTheme.utils";
import { SurveyTheme } from "../../../../components/Survey/SurveyTheme/surveyTheme.types";
import GoogleReview from "../../../../components/Survey/TakeSurvey/GoogleReview";
import RateupLoader from "../../../../components/Loaders/RateupLoader";
import { surveyUploadsPath } from "../../../../utils/constants";
import { imagesPath } from "../../../../utils/constants";
import { motion } from "framer-motion";
import styles from "./end.module.css";
import { lexend500, lexend600 } from "../../../../utils/fonts";

export async function getServerSideProps(context) {
  const { surveyId } = context.params;
  const { msg, language } = context.query;

  let propsToPass: any = {
    enableGoogleReview: false,
  };
  if (msg == "thanks") {
    const [googleLink, reviews, survey] = await Promise.all([
      getPublicSurveyGoogleLink(surveyId),
      getPublicReviewsBySurveyTeamMapId(surveyId, language),
      getPublicSurvey(surveyId),
    ]);
    propsToPass.googleLink = googleLink;
    propsToPass.reviews = reviews;
    if (googleLink) propsToPass.enableGoogleReview = true;
    if (survey) {
      propsToPass.redirect = survey.redirect;
      propsToPass.kioskMode = survey.kioskMode ? "y" : "n";
      // @ts-ignore
      propsToPass.surveyThemeId = survey?.webSurveyThemeId;
    }
  } else {
    const survey = await getPublicSurvey(surveyId);
    if (survey) {
      propsToPass.redirect = survey.redirect;
      propsToPass.kioskMode = survey.kioskMode ? "y" : "n";
      // @ts-ignore
      propsToPass.surveyThemeId = survey?.webSurveyThemeId;
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
  surveyThemeId,
  gift = {
    name: "",
    image: "",
    error: "",
    price: "",
  },
}) {
  const [imageLoading, setImageLoading] = useState(true);
  const [pulsing, setPulsing] = useState(true);
  const largeScreen = useMediaQuery("(min-width: 60em)");
  const isMobile = useMediaQuery("(max-width: 480px)");
  const router = useRouter();
  const [opened, { toggle, close }] = useDisclosure(false);

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
  useEffect(() => {
    if (gift?.name && !gift?.error) {
      toggle();
    }
  }, []);

  const { data: surveyThemeData, isLoading } = useSurveyTheme(
    surveyThemeId,
  ) as {
    data: SurveyTheme;
    isLoading: boolean;
  };
  const theme = useMantineTheme();
  const enableBody = k === "cs" || enableGoogleReview;

  let orgLogo = null;
  let orgLogoStyles = null;
  let orgLogoSrc = null;
  if (surveyThemeData) {
    orgLogo = surveyThemeData.surveyTheme.logo?.logo;
    orgLogoStyles = surveyThemeData.surveyTheme.logo?.styles;
    if (orgLogo && orgLogo.length) {
      orgLogoSrc = `${surveyUploadsPath}${orgLogo}`;
    }
  }

  const imageLoaded = () => {
    setImageLoading(false);
    setTimeout(() => setPulsing(false), 600);
  };
  if (isLoading) return <RateupLoader h={"100dvh"} />;
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
      <Modal
        opened={opened}
        onClose={close}
        closeOnClickOutside={false}
        closeOnEscape={false}
        withCloseButton={false}
        centered
        radius={"md"}
        size={"auto"}
      >
        <Stack align="center" maw={300} px={"xl"} py={"xl"}>
          <Image
            src="/images/gift_box.jpg"
            w={150}
            mih={150}
            mah={150}
            alt="image of gift trophy"
          />
          <Text
            ff={lexend500.style.fontFamily}
            fz={12}
            c={"#19B06E"}
            tt={"uppercase"}
          >
            Congratulations!
          </Text>
          <Text ta={"center"} ff={lexend600.style.fontFamily}>
            Your recent purchases totalling Rs.{gift.price} earned you a myG
            vishukaineettam gift
          </Text>
          <Group justify={"flex-end"} mt={"md"}>
            <RateupButtonBlue
              loading={isLoading}
              type="submit"
              title={"Reveal"}
              onClick={toggle}
              radius={"md"}
              color="#19B06E"
            />
          </Group>
        </Stack>
      </Modal>
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
        {!opened && (
          <>
            <Stack h="100%" w="100%">
              {surveyThemeData?.thankyouTheme?.confettiEnabled &&
                !gift.error && (
                  <Confetti width={width - 1} height={height - 1} />
                )}
              {/* TODO REMOVE LATER: MYG GIFT VISHU */}
              {gift.error && (
                <>
                  <Center mt={"lg"}>
                    {orgLogoSrc && (
                      <Image
                        src={orgLogoSrc}
                        alt="Rateup"
                        height={"auto"}
                        style={orgLogoStyles}
                      />
                    )}
                  </Center>
                  <Stack align="center" gap={"xs"} h={"80%"} justify="center">
                    <Text
                      w={largeScreen ? "70%" : "80%"}
                      ta={"center"}
                      style={surveyThemeData?.thankyouTheme?.subtitle?.styles}
                    >
                      <List>
                        {gift.error
                          ?.toString()
                          ?.split("#")
                          .map((err, i) =>
                            i === 0 ? (
                              <Text key={err}>{err?.toString()}</Text>
                            ) : (
                              <List.Item key={err}>{err?.toString()}</List.Item>
                            ),
                          )
                          .filter(Boolean)}
                      </List>
                    </Text>
                  </Stack>
                </>
              )}
              {!gift.error && gift?.image && gift?.name && (
                <Stack>
                  <Center mt={"lg"}>
                    {orgLogoSrc && (
                      <Image
                        src={orgLogoSrc}
                        alt="Rateup"
                        height={"auto"}
                        style={orgLogoStyles}
                      />
                    )}
                  </Center>
                  <Stack align="center" gap={"sm"} mt={"xl"}>
                    <div
                      className={`${styles.loadable} ${pulsing && styles.pulse}`}
                    >
                      <motion.img
                        initial={{ height: "50px", opacity: 0 }}
                        style={{
                          height: imageLoading ? "6rem" : "auto",
                          borderRadius: "12px",
                        }}
                        animate={{
                          height: imageLoading ? "50px" : "200px",
                          opacity: imageLoading ? 0 : 1,
                        }}
                        transition={{
                          height: { delay: 0, duration: 0.4 },
                          opacity: { delay: 0.5, duration: 0.4 },
                        }}
                        onLoad={imageLoaded}
                        src={`${imagesPath}/offer/${gift?.image}`}
                      />
                    </div>
                    <Text style={surveyThemeData?.thankyouTheme?.title?.styles}>
                      Woohoo!
                    </Text>
                    <Text
                      w={"70%"}
                      ta={"center"}
                      style={surveyThemeData?.thankyouTheme?.subtitle?.styles}
                    >
                      Congratulations you have won
                    </Text>
                    <Text
                      w={"70%"}
                      ta={"center"}
                      style={surveyThemeData?.thankyouTheme?.subtitle?.styles}
                    >
                      {gift?.name}
                    </Text>
                  </Stack>
                </Stack>
              )}
              {!enableGoogleReview && !gift?.image && !gift.error && (
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
                  {orgLogoSrc ? (
                    <Image
                      src={orgLogoSrc}
                      alt="Rateup"
                      height={"auto"}
                      style={orgLogoStyles}
                    />
                  ) : (
                    <IconCircleCheck
                      size={"3rem"}
                      style={orgLogoStyles}
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
                      ...surveyThemeData?.thankyouTheme?.title?.styles,
                      ...{ fontSize: largeScreen ? "3rem" : "1.25rem" },
                    }}
                  >
                    {!!err
                      ? "Thank You!"
                      : surveyThemeData?.thankyouTheme?.title?.title}
                  </Title>
                  {(surveyThemeData?.thankyouTheme?.subtitle?.subtitle ||
                    err) && (
                    <Text
                      style={surveyThemeData?.thankyouTheme?.subtitle?.styles}
                    >
                      {!!err
                        ? "You've already submitted a response earlier."
                        : surveyThemeData?.thankyouTheme?.subtitle?.subtitle}
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
                      orgLogoUrl={orgLogoSrc}
                      surveyTeamMapId={surveyId}
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
          </>
        )}
      </Flex>
    </CreditsCard>
  );
}
