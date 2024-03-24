import { useRouter } from "next/router";
import { useTeamsByUser } from "../../../../backend/team/team.query";
import { getTeamIdByCode } from ".";
import { useDisclosure } from "@mantine/hooks";
import { Stack, Button, Badge, Loader } from "@mantine/core";
import { ReviewSuggestionModal } from "../../../../components/reviewSuggestion/ReviewSuggestionModal";
import { useReviewSuggestionsCount } from "../../../../backend/team/reviewSuggestion/reviewSuggestion.query";

export default function GoogleReviewSuggestionsEditorPage() {
  const router = useRouter();
  const { team_code } = router.query;

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
        Manage review suggestions
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
