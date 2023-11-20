import {
  Center,
  Container,
  Group,
  Stack,
  Paper,
  Title,
  Text,
  Image,
  Button,
  ActionIcon,
  CopyButton,
  Skeleton,
  Box,
  Flex,
  useMantineTheme,
} from "@mantine/core";
import {
  IconCircleCheck,
  IconHome,
  IconRefresh,
  IconWand,
} from "@tabler/icons-react";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { RateupButtonBlue } from "../../../../components/Button/RateupButtons";
import Link from "next/link";
import { useMediaQuery } from "@mantine/hooks";
import { GoogleIcon } from "../../../../components/Button/GoogleIcon";
import { useDeleteReviewSuggestionMutation } from "../../../../backend/team/reviewSuggestion/reviewSuggestion.query";
import { shuffleArray } from "../../../../utils";
import { ReviewSuggestion } from "../../../../types/global";
import { getPublicSurveyGoogleLink } from "../../../../backend/surveys/survey.api";
import { getPublicReviewsBySurveyTeamMapId } from "../../../../backend/team/reviewSuggestion/reviewSuggestion.api";

export default function ThankYou({ enableGoogleReview, googleLink, reviews }) {
  const largeScreen = useMediaQuery("(min-width: 60em)");
  const router = useRouter();
  const { k } = router.query as { k: string }; //kioskMode
  const { surveyId } = router.query as { surveyId: string }; // TODO: rename to surveyTeamMapId

  useEffect(() => {
    //kioskMode redirect
    if (k === "y" || k === "cs") {
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

  const theme = useMantineTheme();
  const enableBody = k === "cs" || enableGoogleReview;
  return (
    <Flex
      style={{
        height: "100vh",
        backgroundColor: theme.colors[theme.primaryColor][6],
      }}
      direction={"column"}
    >
      <Stack
        c="white"
        align="center"
        justify="center"
        p="md"
        style={{
          height: enableGoogleReview ? "min(30vh, 300px)" : "100vh",
        }}
      >
        {<IconCircleCheck size={"3rem"} />}
        <Title order={1} style={{ fontSize: largeScreen ? "3rem" : "1.25rem" }}>
          Thank you for your feedback!
        </Title>
      </Stack>
      {enableBody && (
        <Stack
          align="center"
          justify="center"
          gap="xl"
          style={{
            height: "90vh",
            borderRadius: "28px 28px 0px 0px",
            backgroundColor: "whitesmoke",
          }}
        >
          {enableGoogleReview && (
            <GoogleReview googleLink={googleLink} reviewSuggestions={reviews} />
          )}

          {k === "cs" && (
            <Group m="xl" p="xl">
              <Link
                href={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/public/survey/cs`}
                target="_blank"
              >
                <RateupButtonBlue leftIcon={<IconHome />} title="Go to Home" />
              </Link>
            </Group>
          )}
        </Stack>
      )}
      <Center
        pt={10}
        pb={20}
        style={{
          justifySelf: "flex-end",
        }}
        bg={enableBody ? "whitesmoke" : "inherit"}
        c={enableBody ? "dark" : "white"}
      >
        <Text fz="sm">Powered by </Text>
        <Image
          pl={10}
          src={
            enableBody
              ? `${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/logo.svg`
              : `${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/logo_white.svg`
          }
          alt="RateUp Logo"
          h={35}
          w="auto"
        />
      </Center>
    </Flex>
  );
}

function GoogleReview({ googleLink, reviewSuggestions }) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [reviewIndex, setReviewIndex] = useState<number>(null);
  const [shuffledArray, setShuffledArray] =
    useState<Array<ReviewSuggestion>>(null);
  const [fakeLoading, setFakeLoading] = useState(false);
  const [lastCopiedReview, setLastCopiedReview] =
    useState<ReviewSuggestion>(null);

  useEffect(() => {
    if (reviewSuggestions) {
      setShuffledArray(shuffleArray(reviewSuggestions));
      handleRegenerate();
    }
  }, [reviewSuggestions]);

  function handleRegenerate() {
    setFakeLoading(true);

    if (reviewIndex >= reviewSuggestions.length - 1 || reviewIndex === null) {
      setReviewIndex(0);
      setShuffledArray(shuffleArray(reviewSuggestions));
    } else {
      setReviewIndex(reviewIndex + 1);
    }

    setTimeout(
      () => {
        setFakeLoading(false);
      },
      Math.floor(Math.random() * 500) + 500,
    );
  }

  const deleteReviewMutation = useDeleteReviewSuggestionMutation(
    null, // TODO
    true,
  );
  // if user clicks on go to review page, delete the last copied review
  function handleGoToReviewPage() {
    lastCopiedReview &&
      deleteReviewMutation.mutate(lastCopiedReview.id, {
        onSuccess: () => {
          setLastCopiedReview(null);
        },
      });
  }

  return (
    <Stack
      w="100%"
      align="center"
      justify="space-evenly"
      maw={300}
      style={{
        flex: 1,
      }}
      pt={4}
    >
      <Box style={{ flexShrink: 1 }}>
        <Image
          src={`${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/RateUsOnGoogle1.png`}
          alt="Rate Us On Google"
          height={"auto"}
          maw="min(25vh, 250px)"
        />
      </Box>
      {
        // Only show suggestions if there are atleast 3 reviews
        reviewSuggestions?.length >= 3 &&
          (showSuggestions && shuffledArray !== undefined ? (
            <Paper shadow="md" radius="md" p="sm" w="100%">
              <Stack gap={"xs"} align="center">
                <Group justify="space-between" w="100%">
                  <Title order={4}>Suggestions</Title>
                  <ActionIcon
                    variant="transparent"
                    color="dark"
                    onClick={handleRegenerate}
                  >
                    <IconRefresh />
                  </ActionIcon>
                </Group>
                {fakeLoading || !shuffledArray ? (
                  <Box h="150px" w="100%">
                    <Skeleton height={8} radius="xl" />
                    <Skeleton height={8} mt={6} radius="xl" />
                    <Skeleton height={8} mt={6} width="70%" radius="xl" />
                  </Box>
                ) : (
                  <Text
                    p="xs"
                    h="150px"
                    style={{
                      overflow: "auto",
                      wordBreak: "break-word",
                    }}
                  >
                    {shuffledArray?.[reviewIndex]?.review}
                  </Text>
                )}
                <CopyButton value={shuffledArray?.[reviewIndex]?.review}>
                  {({ copied, copy }) => (
                    <Button
                      color={copied ? "teal" : "unset"}
                      onClick={() => {
                        setLastCopiedReview(shuffledArray?.[reviewIndex]);
                        copy();
                      }}
                      w="120px"
                      radius={"lg"}
                    >
                      {copied ? "Copied" : "Copy"}
                    </Button>
                  )}
                </CopyButton>
              </Stack>
            </Paper>
          ) : (
            <Stack align="center" gap={"xs"}>
              <Text c="dark">Need Inspirations?</Text>
              <Button
                leftSection={<IconWand />}
                variant="outline"
                onClick={() => setShowSuggestions(true)}
                radius={"xl"}
                h="50px"
              >
                Generate Suggestions
              </Button>
            </Stack>
          ))
      }
      <Link
        href={`${googleLink}`}
        target="_blank"
        style={{
          textDecoration: "none",
          width: "100%",
        }}
      >
        <Button
          leftSection={<GoogleIcon />}
          radius={"md"}
          variant="filled"
          fullWidth
          onClick={handleGoToReviewPage}
          h="50px"
          style={{
            boxShadow: "0px 7.20472px 43.22835px 0px rgba(0, 0, 0, 0.13)",
          }}
        >
          Go to Review Page
        </Button>
      </Link>
    </Stack>
  );
}

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
