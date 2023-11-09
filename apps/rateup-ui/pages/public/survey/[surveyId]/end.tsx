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
} from "@mantine/core";
import {
  IconBrandGoogle,
  IconCircleCheck,
  IconHome,
  IconJewishStar,
  IconRefresh,
  IconWand,
} from "@tabler/icons-react";
import React, { useState, useEffect, useContext } from "react";
import { useRouter } from "next/router";
import { RateupButtonBlue } from "../../../../components/Button/RateupButtons";
import {
  usePublicSurveyGoogleLink,
  useSurvey,
} from "../../../../backend/surveys/surveys.query";
import Link from "next/link";
import { useMediaQuery } from "@mantine/hooks";
import { GoogleIcon } from "../../../../public/images/icons/GoogleIcon";
import {
  useDeleteReviewSuggestionMutation,
  useReviewSuggestions,
} from "../../../../backend/team/reviewSuggestion/reviewSuggestion.query";
import { shuffleArray } from "../../../../utils";
import { ReviewSuggestion } from "../../../../types/global";
import SurveyContext from "../../../../context/SurveyContext";

export default function ThankYou() {
  const largeScreen = useMediaQuery("(min-width: 60em)");
  const router = useRouter();
  const { msg } = router.query;
  const { k } = router.query as { k: string }; //kioskMode
  const { surveyId } = router.query as { surveyId: string };
  const { selectedTeamId } = useContext(SurveyContext);

  const [enableGoogleReview, setEnableGoogleReview] = useState(false);
  const { data: survey } = useSurvey(surveyId);

  const {
    isLoading,
    isError,
    data: googleLink,
  } = usePublicSurveyGoogleLink(surveyId);

  useEffect(() => {
    msg === "thanks" && setEnableGoogleReview(true);
  }, [router, msg]);

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

  if (!survey) return null;

  // TODO: add customisable thankyou page
  return (
    <Container style={{ background: "#F7F7F7" }}>
      <Stack style={{ height: "100vh" }}>
        <Stack
          align="center"
          justify="center"
          gap="xl"
          style={{ height: "90vh" }}
        >
          <IconCircleCheck size={"4rem"} />
          <Title order={1} style={{ fontSize: largeScreen ? "4rem" : "3rem" }}>
            Thank you
          </Title>
          {enableGoogleReview && !isLoading && googleLink?.length > 4 && (
            <GoogleReview googleLink={googleLink} teamId={selectedTeamId} />
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
        <Center mb={30}>
          <Text fz="sm">Powered by </Text>
          <Image
            pl={10}
            src={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/logo.svg`}
            alt="RateUp Logo"
            w={80}
            h={20}
          />
        </Center>
      </Stack>
    </Container>
  );
}

function GoogleReview({ googleLink, teamId }) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { data: reviewSuggestions } = useReviewSuggestions(true, teamId);

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
    teamId,
    () => setLastCopiedReview(null),
    undefined,
    true,
  );
  // if user clicks on go to review page, delete the last copied review
  function handleGoToReviewPage() {
    lastCopiedReview && deleteReviewMutation.mutate(lastCopiedReview.id);
  }

  return (
    <Stack w="100%" align="center" maw={400}>
      <Text>Kindly Leave a Google Review</Text>
      {
        // Only show suggestions if there are atleas 3 reviews
        reviewSuggestions?.length >= 3 &&
          (showSuggestions && shuffledArray !== undefined ? (
            <Paper shadow="sm" radius="md" p="sm">
              <Stack gap={"xs"} align="center" miw="250px">
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
            <Button
              leftSection={<IconWand />}
              variant="outline"
              onClick={() => setShowSuggestions(true)}
              radius={"lg"}
            >
              Generate Suggestions
            </Button>
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
          variant="outline"
          fullWidth
          onClick={handleGoToReviewPage}
        >
          Go to Review Page
        </Button>
      </Link>
    </Stack>
  );
}
