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
  IconCircleCheck,
  IconHome,
  IconRefresh,
  IconWand,
} from "@tabler/icons-react";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { RateupButtonBlue } from "../../../../components/Button/RateupButtons";
import { usePublicSurveyGoogleLink } from "../../../../backend/surveys/surveys.query";
import Link from "next/link";
import { useMediaQuery } from "@mantine/hooks";
import { GoogleIcon } from "../../../../public/images/icons/GoogleIcon";
import {
  useDeleteReviewSuggestionMutation,
  usePublicReviewSuggestions,
} from "../../../../backend/team/reviewSuggestion/reviewSuggestion.query";
import { shuffleArray } from "../../../../utils";
import { ReviewSuggestion } from "../../../../types/global";

export default function ThankYou() {
  const largeScreen = useMediaQuery("(min-width: 60em)");
  const router = useRouter();
  const { msg } = router.query;
  const { k } = router.query as { k: string }; //kioskMode
  const { surveyId } = router.query as { surveyId: string }; // TODO: rename to surveyTeamMapId

  const [enableGoogleReview, setEnableGoogleReview] = useState(false);

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

  return (
    <Container style={{ background: "#F7F7F7" }}>
      <Stack style={{ height: "100vh" }}>
        <Stack
          align="center"
          justify="center"
          gap="xl"
          style={{ height: "90vh" }}
        >
          {enableGoogleReview || <IconCircleCheck size={"4rem"} />}
          <Title order={1} style={{ fontSize: largeScreen ? "4rem" : "3rem" }}>
            Thank you
          </Title>
          {enableGoogleReview && !isLoading && googleLink?.length > 4 && (
            <GoogleReview googleLink={googleLink} surveyTeamMapId={surveyId} />
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

function GoogleReview({ googleLink, surveyTeamMapId }) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { data: reviewSuggestions } =
    usePublicReviewSuggestions(surveyTeamMapId);

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
    <Stack w="100%" align="center" maw={300}>
      <Image
        src={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/RateUsOnGoogle.png`}
        alt="Rate Us On Google"
        maw="200px"
        mah="200px"
      />
      {
        // Only show suggestions if there are atleast 3 reviews
        reviewSuggestions?.length >= 3 &&
          (showSuggestions && shuffledArray !== undefined ? (
            <Paper shadow="sm" radius="md" p="sm" w="100%">
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
          h="50px"
          bg="white"
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
