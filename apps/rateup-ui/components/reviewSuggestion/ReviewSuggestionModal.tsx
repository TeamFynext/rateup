"use client";

import { useEffect, useState } from "react";

import {
  ActionIcon,
  Badge,
  Box,
  Button,
  FileButton,
  Flex,
  Group,
  Modal,
  Select,
  SelectProps,
  Space,
  Stack,
  Tabs,
  Text,
  Textarea,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import {
  IconCheck,
  IconPencil,
  IconTrash,
  IconUpload,
} from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import {
  useCreateReviewSuggestionsMutation,
  useDeleteReviewSuggestionMutation,
  useReviewSuggestions,
  useUpdateReviewSuggestionMutation,
} from "../../backend/team/reviewSuggestion/reviewSuggestion.query";
import { useSurveyLanguagesFromTeam } from "../../backend/team/team.query";
import { ReviewSuggestion } from "../../types/global";
import { showErrorToast } from "../../utils/notifications";
import {
  ContainedSelection,
  ContainedTextArea,
} from "../input/ContainedInput/ContainedInput";

enum ReviewSuggestionTab {
  Custom = "custom",
  Json = "json",
}
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
  const translations = useTranslations();
  const {
    data: reviewSuggestions,
    isLoading,
    isError,
  } = useReviewSuggestions(opened, teamId);

  if (isError && opened) {
    showErrorToast(translations("Error fetching review suggestions"));
    return;
  }

  return (
    <Modal
      title={translations("Suggest reviews")}
      opened={opened}
      onClose={onClose}
      size="lg"
      styles={{
        title: {
          fontSize: "1.4rem",
          fontWeight: 600,
        },
      }}
    >
      <Tabs defaultValue={ReviewSuggestionTab.Custom}>
        <Tabs.List>
          <Tabs.Tab value={ReviewSuggestionTab.Custom}>Custom</Tabs.Tab>
          <Tabs.Tab value={ReviewSuggestionTab.Json}>JSON</Tabs.Tab>
        </Tabs.List>
        <Space h="12px" />
        <Tabs.Panel value={ReviewSuggestionTab.Custom}>
          <CustomPanel
            teamId={teamId}
            reviewSuggestions={reviewSuggestions}
            handleClose={onClose}
          />
        </Tabs.Panel>
        <Tabs.Panel value={ReviewSuggestionTab.Json}>
          <ImportJsonPanel handleClose={onClose} teamId={teamId} />
        </Tabs.Panel>
      </Tabs>
    </Modal>
  );
}

function CustomPanel({ teamId, reviewSuggestions, handleClose }) {
  return (
    <>
      <CreateReviewSuggestionComponent teamId={teamId} />
      <Stack
        mah="60vh"
        style={{
          overflowY: "auto",
          backgroundColor: "transparent",
        }}
        p="md"
      >
        <DisplayReviews reviews={reviewSuggestions} />
      </Stack>
      <Group justify="end" pt="sm">
        <Button variant="outline" color="gray" onClick={handleClose}>
          Cancel
        </Button>
        <Button onClick={handleClose}>Save</Button>
      </Group>
    </>
  );
}

const expectedJsonFormat = `[
  "Review 1",
  "Review 2",
  "Review 3"
]`;

function ImportJsonPanel({ handleClose, teamId }) {
  const [file, setFile] = useState<File | null>(null);
  const [language, setLanguage] = useState("");

  useEffect(() => {
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      form.setFieldValue("json", e.target.result as string);
    };
    reader.readAsText(file);
  }, [file]);

  const form = useForm({
    initialValues: {
      json: "",
    },
    validate: {
      json: (value) => {
        try {
          JSON.parse(value);
          return null;
        } catch (e) {
          return "Invalid JSON";
        }
      },
    },
    validateInputOnBlur: true,
  });

  const createMutation = useCreateReviewSuggestionsMutation(teamId);
  function handleImport() {
    const { hasErrors } = form.validate();
    if (hasErrors) {
      showErrorToast("Invalid JSON");
      return;
    }
    const reviews = JSON.parse(form.values.json) as Array<string>;
    createMutation.mutate({
      reviewSuggestions: reviews,
      teamId: teamId,
      language: language,
    });
  }
  const translations = useTranslations();
  return (
    <Stack>
      <TeamSurveyLanguageSelector
        value={language}
        onChange={setLanguage}
        teamId={teamId}
        w={150}
        styles={{
          input: {
            fontSize: "0.8rem",
            borderRadius: "8px",
          },
        }}
      />
      <Textarea
        label={translations("Paste JSON")}
        placeholder={expectedJsonFormat}
        rows={5}
        {...form.getInputProps("json")}
      />
      <Text ta={"center"}>OR</Text>
      <FileButton accept="application/json" onChange={setFile}>
        {(props) => (
          <Button leftSection={<IconUpload />} {...props}>
            {translations("Upload JSON")}
          </Button>
        )}
      </FileButton>
      <Group justify="end" mt="sm">
        <Button variant="outline" color="gray" onClick={handleClose}>
          {translations("Cancel")}
        </Button>
        <Button onClick={handleImport}>Import</Button>
      </Group>
    </Stack>
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
      {reviews.map((review, index) => (
        <ReviewCard
          index={index + 1}
          key={review.id}
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
  index: number;
}
function ReviewCard({
  index,
  review: { review, id, teamId, language: initialLanguage },
  isEditing,
  setEditingItem,
}: ReviewCardProps) {
  const [value, setValue] = useState(review);
  const [language, setLanguage] = useState(initialLanguage);
  const updateMutation = useUpdateReviewSuggestionMutation(teamId);
  const deleteMutation = useDeleteReviewSuggestionMutation(teamId);

  function handleUpdate() {
    if (value !== review) {
      updateMutation.mutate(
        {
          review: value,
          language: language,
          id,
        },
        {
          onSuccess: () => {
            setEditingItem(null);
          },
          onError: () => {
            setEditingItem(null);
          },
        },
      );
    } else {
      setEditingItem(null);
    }
  }
  return (
    <Box p="sm">
      <Flex gap={"sm"} align={"center"}>
        <Badge p="sm" radius={"xl"}>
          {index}
        </Badge>
        {isEditing ? (
          <Group flex={1} align="center">
            <Textarea
              value={value}
              onChange={(e) => setValue(e.currentTarget.value)}
              autoFocus
              style={{
                flexGrow: 1,
              }}
              flex={1}
            />
            <TeamSurveyLanguageSelector
              value={language}
              onChange={setLanguage}
              teamId={teamId}
              w={150}
              styles={{
                input: {
                  fontSize: "0.8rem",
                  borderRadius: "8px",
                },
              }}
            />
            <ActionIcon
              variant="transparent"
              onClick={handleUpdate}
              color="green"
            >
              <IconCheck />
            </ActionIcon>
          </Group>
        ) : (
          <Group flex={1} align="center">
            <Text
              style={{
                flexGrow: 1,
                border: "1px solid gray",
                borderRadius: "12px",
              }}
              onDoubleClick={() => setEditingItem(id)}
              p="md"
              flex={1}
            >
              {review}
            </Text>
            <ActionIcon
              variant="transparent"
              onClick={() => setEditingItem(id)}
            >
              <IconPencil />
            </ActionIcon>
          </Group>
        )}
        <ActionIcon
          variant="transparent"
          color="red"
          onClick={() => deleteMutation.mutate(id)}
        >
          <IconTrash />
        </ActionIcon>
      </Flex>
    </Box>
  );
}

function CreateReviewSuggestionComponent({ teamId }) {
  const createReviewMutation = useCreateReviewSuggestionsMutation(teamId);
  const [newReview, setNewReview] = useState("");
  const [language, setLanguage] = useState("");
  const translations = useTranslations();
  function handleAddReview() {
    createReviewMutation.mutate({
      reviewSuggestions: [newReview],
      teamId,
      language: language,
    });
    setNewReview("");
  }
  return (
    <Flex
      p="sm"
      gap={"sm"}
      align={"stretch"}
      style={{
        border: "1px solid gray",
        borderRadius: "12px",
        boxShadow: "0px 6px 16px 0px rgba(0, 0, 0, 0.1)",
      }}
    >
      <ContainedTextArea
        placeholder={translations("Suggest a review")}
        style={{
          flex: 4,
        }}
        styles={{
          input: {
            border: "none",
          },
        }}
        variant="unstyled"
        rows={4}
        value={newReview}
        onChange={(e) => setNewReview(e.currentTarget.value)}
      />
      <TeamSurveyLanguageSelector
        value={language}
        onChange={setLanguage}
        teamId={teamId}
        w={150}
        styles={{
          input: {
            fontSize: "0.8rem",
            borderRadius: "8px",
          },
        }}
      />

      <Button
        style={{
          height: "inherit",
          minWidth: "80px",
        }}
        radius={"8px"}
        onClick={handleAddReview}
        h={45}
      >
        {translations("Add")}
      </Button>
    </Flex>
  );
}

interface TeamSurveyLanguageSelectorProps extends SelectProps {
  teamId: string;
  value?: string;
  onChange?: (value: string) => void;
}
export function TeamSurveyLanguageSelector({
  teamId,
  value,
  onChange,
  ...props
}: TeamSurveyLanguageSelectorProps) {
  const { data: languages } = useSurveyLanguagesFromTeam(teamId);
  const translations = useTranslations();
  useEffect(() => {
    if (!value && languages?.length > 0) {
      onChange(languages[0]);
    }
  }, [languages]);

  return (
    <ContainedSelection
      data={languages}
      value={value}
      onChange={onChange}
      placeholder={translations("Select language")}
      {...props}
    />
  );
}
