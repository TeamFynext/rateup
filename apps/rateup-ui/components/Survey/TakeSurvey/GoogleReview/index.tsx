import { useCallback, useEffect, useRef, useState } from "react";
import { ReviewSuggestion } from "../../../../types/global";
import { shuffleArray } from "../../../../utils";
import { useDeleteReviewSuggestionMutation } from "../../../../backend/team/reviewSuggestion/reviewSuggestion.query";
import {
  Box,
  Button,
  Image,
  Modal,
  Skeleton,
  Stack,
  Text,
} from "@mantine/core";
import Link from "next/link";
import { GoogleIcon } from "../../../Button/GoogleIcon";
import styles from "./GoogleReview.module.css";
import WandIcon from "./WandIcon";
import { lexend500 } from "../../../../utils/fonts";
import { useDisclosure } from "@mantine/hooks";
import RateupRedirectCard from "../../../Card/RateupRedirectCard";

function GoogleReview({ googleLink, reviewSuggestions, orgLogoUrl }) {
  const [showSuggestions, setShowSuggestions] = useState(false);

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

  const suggestionPRef = useRef(null);

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

  const handleCopyBtnClick = useCallback(() => {
    const suggestionP = suggestionPRef.current;
    if (suggestionP) {
      navigator.clipboard.writeText(suggestionP.textContent);
      openSuggestionCopiedModal();
    }
  }, [isSuggestionCopiedModalOpen]);

  return (
    <Box className={styles["google-review-div"]}>
      {orgLogoUrl && (
        <Box className={styles["org-logo-container"]}>
          <Image src={orgLogoUrl} alt="Organization Logo" />
        </Box>
      )}
      <Box className={styles["happy-text-div"]}>
        <h2 className={lexend500.className}>Make us more happy!</h2>
        <Box className={styles["leave-review-paras-container"]}>
          <p>Leave us a review on Google.</p>
          <p>That is all you need to do.</p>
        </Box>
      </Box>
      {reviewSuggestions?.length >= 3 && (
        <Box className={styles["review-suggestions-container"]}>
          <p>Need Inspirations?</p>
          <Box className={styles["suggestions-div"]}>
            <Button
              className={styles["generate-suggestions-btn"]}
              leftSection={<WandIcon />}
              onClick={handleRegenerate}
            >
              Regenerate Suggestions
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
                  Copy
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
                  ref={suggestionPRef}
                >
                  {shuffledArray?.[reviewIndex]?.review}
                </Text>
                <Button
                  className={styles["copy-btn"]}
                  onClick={handleCopyBtnClick}
                >
                  Copy
                </Button>
              </Box>
            )}
          </Box>
        </Box>
      )}
      <Box className={styles["google-review-link-container"]}>
        <Link
          href={`${googleLink}`}
          target="_blank"
          onClick={handleGoToReviewPage}
        >
          <span>Go to Review Page</span>
          <span>
            <GoogleIcon />
          </span>
        </Link>
      </Box>

      <RateupRedirectCard className={styles["powered-by-container"]} />

      <Modal
        className={styles["suggestion-copied-modal"]}
        opened={isSuggestionCopiedModalOpen}
        onClose={closeSuggestionCopiedModal}
        centered
        withCloseButton={false}
        title={false}
      >
        <p className={styles["suggestion-copied-text-p"]}>
          Your Suggestion is copied!
        </p>
        <Box className={styles["google-review-link-container"]}>
          <Link
            href={`${googleLink}`}
            target="_blank"
            onClick={handleGoToReviewPage}
          >
            <span>Go to Review Page</span>
            <span>
              <GoogleIcon />
            </span>
          </Link>
        </Box>
      </Modal>
    </Box>
  );
}

export default GoogleReview;
