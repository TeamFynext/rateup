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
import { IconHome } from "@tabler/icons-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Confetti from "react-confetti";
import {
  getPublicSurvey,
  getPublicSurveyGoogleLink,
} from "../../../../backend/surveys/survey.api";
import { getPublicReviewsBySurveyTeamMapId } from "../../../../backend/team/reviewSuggestion/reviewSuggestion.api";
import { RateupButtonBlue } from "../../../../components/Button/RateupButtons";
import { CreditsCard } from "../../../../components/Card/CreditsCard";
import RateupRedirectCard from "../../../../components/Card/RateupRedirectCard";
import GoogleReview from "../../../../components/Survey/TakeSurvey/GoogleReview";
import { imagesPath, surveyUploadsPath } from "../../../../utils/constants";
import { lexend500, lexend600 } from "../../../../utils/fonts";
import styles from "./end.module.css";
import { getBgImgAndBgColor } from "../../../../components/Layout/TakeSurveyLayout/utils";

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
      propsToPass.surveyThemeData = survey?.webSurveyTheme?.theme;
    }
  } else {
    const survey = await getPublicSurvey(surveyId);
    if (survey) {
      propsToPass.redirect = survey.redirect;
      propsToPass.kioskMode = survey.kioskMode ? "y" : "n";
      // @ts-ignore
      propsToPass.surveyThemeData = survey?.webSurveyTheme?.theme;
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
            backgroundColor: backgroundColor,
            backgroundImage: `url(${backgroundImageSrc})`,
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
                        fit="contain"
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
                        fit="contain"
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
                  <Title
                    order={1}
                    style={{
                      ...surveyThemeData?.thankyouTheme?.title?.styles,
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
