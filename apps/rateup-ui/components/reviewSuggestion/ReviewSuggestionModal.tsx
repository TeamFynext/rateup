import {
  ActionIcon,
  Button,
  Flex,
  Modal,
  Paper,
  Stack,
  Text,
  Textarea,
} from "@mantine/core";
import {
  useCreateReviewSuggestionMutation,
  useDeleteReviewSuggestionMutation,
  useReviewSuggestions,
  useUpdateReviewSuggestionMutation,
} from "../../backend/team/reviewSuggestion/reviewSuggestion.query";
import { showErrorToast } from "../../utils/notifications";
import { ReviewSuggestion } from "../../types/global";
import { ContainedTextArea } from "../input/ContainedInput/ContainedInput";
import {
  IconCheck,
  IconPencil,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { useState } from "react";

interface ReviewSuggestionModalProps {
  teamId: string;
  opened: boolean;
  onClose: () => void;
}
export function ReviewSuggestionModal({
  teamId,
  opened,
  onClose,
}: ReviewSuggestionModalProps) {
  const {
    data: reviewSuggestions,
    isLoading,
    isError,
  } = useReviewSuggestions(opened, teamId);

  if (isError && opened) {
    showErrorToast("Error fetching review suggestions");
    return;
  }

  return (
    <Modal title="Suggest reviews" opened={opened} onClose={onClose} size="lg">
      <Stack
        mah="70vh"
        style={{
          backgroundColor: "whitesmoke",
          borderRadius: "8px",
          overflowY: "auto",
        }}
        p="md"
      >
        <DisplayReviews reviews={reviewSuggestions} />
      </Stack>
      <CreateReviewSuggestionComponent teamId={teamId} />
    </Modal>
  );
}

interface DisplayReviewsProps {
  reviews: Array<ReviewSuggestion>;
}
function DisplayReviews({ reviews }: DisplayReviewsProps) {
  const [editingItem, setEditingItem] = useState<string | null>(null);
  if (!reviews) {
    return null;
  }
  if (reviews.length === 0) {
    return <Text>No reviews yet</Text>;
  }
  return (
    <>
      {reviews.map((review) => (
        <ReviewCard
          review={review}
          isEditing={editingItem === review.id}
          setEditingItem={setEditingItem}
        />
      ))}
    </>
  );
}

interface ReviewCardProps {
  review: ReviewSuggestion;
  isEditing?: boolean;
  setEditingItem?: (id: string) => void;
}
function ReviewCard({
  review: { review, id, teamId },
  isEditing,
  setEditingItem,
}: ReviewCardProps) {
  const [value, setValue] = useState(review);
  const updateMutation = useUpdateReviewSuggestionMutation(
    teamId,
    () => {
      setEditingItem(null);
    },
    () => {
      setEditingItem(null);
    },
  );
  const deleteMutation = useDeleteReviewSuggestionMutation(teamId);
  function handleUpdate() {
    if (value !== review) {
      updateMutation.mutate({
        review: value,
        id,
      });
    }
  }
  return (
    <Paper p="sm">
      <Flex gap={"sm"}>
        {isEditing ? (
          <>
            <Textarea
              value={value}
              onChange={(e) => setValue(e.currentTarget.value)}
              style={{
                flexGrow: 1,
              }}
            />
            <ActionIcon
              variant="transparent"
              onClick={handleUpdate}
              color="green"
            >
              <IconCheck />
            </ActionIcon>
          </>
        ) : (
          <>
            <Text
              style={{
                flexGrow: 1,
              }}
            >
              {review}
            </Text>
            <ActionIcon
              variant="transparent"
              onClick={() => setEditingItem(id)}
            >
              <IconPencil />
            </ActionIcon>
          </>
        )}
        <ActionIcon
          variant="transparent"
          color="red"
          onClick={() => deleteMutation.mutate(id)}
        >
          <IconTrash />
        </ActionIcon>
      </Flex>
    </Paper>
  );
}

function CreateReviewSuggestionComponent({ teamId }) {
  const createReviewMutation = useCreateReviewSuggestionMutation(teamId);
  const [newReview, setNewReview] = useState("");

  function handleAddReview() {
    createReviewMutation.mutate({
      review: newReview,
      teamId,
    });
    setNewReview("");
  }
  return (
    <Flex py="sm" gap={"sm"} align={"center"}>
      <ContainedTextArea
        placeholder="Suggest a review"
        style={{
          flex: 2,
        }}
        value={newReview}
        onChange={(e) => setNewReview(e.currentTarget.value)}
      />
      <Button
        variant="outline"
        leftSection={<IconPlus />}
        style={{
          flex: 1,
        }}
        onClick={handleAddReview}
      >
        Add suggestion
      </Button>
    </Flex>
  );
}
