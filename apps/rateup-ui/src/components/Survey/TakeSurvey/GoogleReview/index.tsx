"use client";

import { useCallback, useEffect, useState } from "react";

import {
  Box,
  Button,
  Image,
  Modal,
  Skeleton,
  Stack,
  Text,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import type { ReviewSuggestion } from "@/types/global";
import { useUpdateReviewLinkStatsOnSurveyMutation } from "@/backend/surveys/surveys.query";
import { useDeleteReviewSuggestionMutation } from "@/backend/team/reviewSuggestion/reviewSuggestion.query";

import { shuffleArray } from "@/utils/index.ts";
import { GoogleIcon } from "../../../Button/GoogleIcon.tsx";
import RateupRedirectCard from "../../../Card/RateupRedirectCard.tsx";
import { ReviewPagePlatform } from "../../Question/QuestionReviewPageEditor/index.tsx";
import { reviewPageLogosObj } from "../../Question/QuestionReviewPageEditor/constants.tsx";
import styles from "./GoogleReview.module.css";
import WandIcon from "./WandIcon.tsx";

function GoogleReview({
  reviewSuggestions = [],
  orgLogoUrl = "",
  surveyTeamMapId = "",
  isSurveyPreview = false,
  survey,
  reviewPageLinks = null,
}) {
  const [
    isSuggestionCopiedModalOpen,
    { open: openSuggestionCopiedModal, close: closeSuggestionCopiedModal },
  ] = useDisclosure(false);

  const [reviewIndex, setReviewIndex] = useState<number>(null);
  const [shuffledArray, setShuffledArray] =
    useState<Array<ReviewSuggestion>>(null);
  const [fakeLoading, setFakeLoading] = useState(false);
  const [lastCopiedReview, setLastCopiedReview] =
    useState<ReviewSuggestion>(null);
  const { t: translations } = useTranslation();
  useEffect(() => {
    if (reviewSuggestions.length > 0) {
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
    surveyTeamMapId,
    true,
  );
  const updateReviewPageVisits = useUpdateReviewLinkStatsOnSurveyMutation(
    survey?.id,
  );
  // if user clicks on go to review page, delete the last copied review
  function handleGoToReviewPage() {
    updateReviewPageVisits.mutate(surveyTeamMapId);
    lastCopiedReview &&
      deleteReviewMutation.mutate(lastCopiedReview.id, {
        onSuccess: () => {
          setLastCopiedReview(null);
        },
      });
  }

  const handleCopyBtnClick = useCallback(() => {
    const currentReview = shuffledArray[reviewIndex];
    if (currentReview) {
      navigator.clipboard.writeText(currentReview.review);
      openSuggestionCopiedModal();
      setLastCopiedReview(currentReview);
    }
  }, [isSuggestionCopiedModalOpen, shuffledArray, reviewIndex]);

  const questionWithReviewPageOptions = survey?.questions?.find((question) => {
    return Boolean(question?.reviewPageOptions);
  });

  if (!reviewPageLinks) reviewPageLinks = survey?.reviewPageLinks;

  let reviewPagePlatform =
    questionWithReviewPageOptions?.reviewPagePlatform ||
    ReviewPagePlatform.Google;
  if (reviewPagePlatform === ReviewPagePlatform.Custom) {
    reviewPagePlatform =
      questionWithReviewPageOptions?.reviewPageOptions?.customPlatformName;
  }

  const link = reviewPageLinks?.[reviewPagePlatform];
  const reviewLink = link?.trim();

  return (
    <Stack mih={isSurveyPreview ? "100%" : "100dvh"}>
      <Box className={styles["google-review-div"]}>
        {orgLogoUrl && (
          <Box className={styles["org-logo-container"]}>
            <Image src={orgLogoUrl} alt="Organization Logo" />
          </Box>
        )}
        <Box className={styles["happy-text-div"]}>
          <h2
            style={{
              fontWeight: 500,
            }}
          >
            Make us more happy!
          </h2>
          <Box className={styles["leave-review-paras-container"]}>
            <p>{`Leave us a review on ${reviewPagePlatform}`}</p>
          </Box>
        </Box>
        {reviewSuggestions?.length >= 3 && (
          <Box className={styles["review-suggestions-container"]}>
            <p>{translations("Need Inspirations?")}</p>
            <Box className={styles["suggestions-div"]}>
              <Button
                className={styles["generate-suggestions-btn"]}
                leftSection={<WandIcon />}
                onClick={handleRegenerate}
              >
                {translations("Regenerate Suggestions")}
              </Button>
              {fakeLoading || !shuffledArray ? (
                <Box className={styles["review-suggestion-skeleton-container"]}>
                  <Box className={styles["skeleton-divs-conainer"]}>
                    <Skeleton height={10} radius="xl" />
                    <Skeleton height={10} mt={6} radius="xl" />
                    <Skeleton height={10} mt={6} radius="xl" />
                    <Skeleton height={10} mt={6} radius="xl" />
                    <Skeleton height={10} mt={6} radius="xl" />
                    <Skeleton height={10} mt={6} radius="xl" />
                    <Skeleton height={10} mt={6} radius="xl" />
                    <Skeleton height={10} mt={6} radius="xl" />
                    <Skeleton height={10} mt={6} width="70%" radius="xl" />
                  </Box>

                  <Button className={styles["copy-btn"]} disabled>
                    {translations("Copy")}
                  </Button>
                </Box>
              ) : (
                <Box className={styles["suggestion-content"]}>
                  <Text
                    h="150px"
                    style={{
                      overflow: "auto",
                      wordBreak: "break-word",
                    }}
                    className={styles["suggestion-p"]}
                  >
                    {shuffledArray?.[reviewIndex]?.review}
                  </Text>
                  <Button
                    className={styles["copy-btn"]}
                    onClick={handleCopyBtnClick}
                  >
                    {translations("Copy")}
                  </Button>
                </Box>
              )}
            </Box>
          </Box>
        )}
        <Box className={styles["google-review-link-container"]}>
          {reviewLink ? (
            <Link to={reviewLink} target="_blank" onClick={handleGoToReviewPage}>
              <span>{translations("Go to Review Page")}</span>
              <span className={styles["google-review-link-img-span"]}>
                {reviewPageLogosObj[reviewPagePlatform] || null}
              </span>
            </Link>
          ) : (
            <span>{translations("Review link unavailable")}</span>
          )}
        </Box>

        <Modal
          className={styles["suggestion-copied-modal"]}
          opened={isSuggestionCopiedModalOpen}
          onClose={closeSuggestionCopiedModal}
          centered
          withCloseButton={false}
          title={false}
        >
          <p className={styles["suggestion-copied-text-p"]}>
            {translations("Your Suggestion is copied!")}
          </p>
          <Box className={styles["google-review-link-container"]}>
            {reviewLink ? (
              <Link to={reviewLink} target="_blank" onClick={handleGoToReviewPage}>
                <span>{translations("Go to Review Page")}</span>
                <span>
                  <GoogleIcon />
                </span>
              </Link>
            ) : (
              <span>{translations("Review link unavailable")}</span>
            )}
          </Box>
        </Modal>
      </Box>
      <Box>
        <RateupRedirectCard className={styles["powered-by-container"]} />
      </Box>
    </Stack>
  );
}

export default GoogleReview;

