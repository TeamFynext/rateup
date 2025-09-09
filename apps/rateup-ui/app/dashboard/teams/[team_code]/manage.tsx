"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { Badge, Button, Loader, Stack } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useTranslations } from "next-intl";

import { useReviewSuggestionsCount } from "../../../../backend/team/reviewSuggestion/reviewSuggestion.query";
import { useTeamsByUser } from "../../../../backend/team/team.query";
import { ReviewSuggestionModal } from "../../../../components/reviewSuggestion/ReviewSuggestionModal";
import { getTeamIdByCode } from "./page";

export default function GoogleReviewSuggestionsEditorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const team_code = searchParams.get("team_code");

  const translations = useTranslations();
  const {
    isLoading: isLoadingTeamsUser,
    data: teamsDataUser,
    error: errorTeamsDataUser,
  } = useTeamsByUser() as UseTeamsByUserResult;
  let teamsData = teamsDataUser?.data;
  let teamCode: string = team_code?.toString();
  let teamId = getTeamIdByCode(teamsData, teamCode);
  const [
    reviewModalOpened,
    { open: openReviewModal, close: closeReviewModal },
  ] = useDisclosure(false);
  const { data: count, isLoading } = useReviewSuggestionsCount(
    !!teamId,
    teamId,
  );

  return (
    <Stack>
      <Button variant="light" onClick={openReviewModal}>
        {translations("Manage review suggestions")}
        {isLoading || !(typeof count === "number") ? (
          <Loader size={"xs"} ml="xs" type="bars" />
        ) : (
          <Badge ml="xs">{count}</Badge>
        )}
      </Button>
      <ReviewSuggestionModal
        teamId={teamId}
        opened={reviewModalOpened}
        onClose={closeReviewModal}
      />
    </Stack>
  );
}
