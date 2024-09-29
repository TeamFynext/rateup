import { useContext } from "react";

import {
  ActionIcon,
  Button,
  Group,
  Modal,
  MultiSelect,
  Paper,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useListState } from "@mantine/hooks";
import { IconChevronDown, IconChevronUp, IconTrash } from "@tabler/icons-react";

import useTranslations from "@/dictionaries/useTranslation";

import {
  useCreateRMTopicMutation,
  useDeleteRMTopicMutation,
  useRMTopics,
} from "../../../backend/reputation_management/topic/topic.query";
import SelectedTeamContext from "../../../context/SelectedTeam";
import RateupLoader from "../../Loaders/RateupLoader";

interface CreateTopicModalProps {
  opened: boolean;
  onClose: () => void;
  entities: {
    // wordcloud format
    [key: string]: {
      count: number;
      sentiment: number;
    };
  };
}
export function CreateTopicModal({
  opened,
  onClose,
  entities,
}: CreateTopicModalProps) {
  const { selectedTeamId } = useContext(SelectedTeamContext);
  const [expandedTopics, etHandlers] = useListState([]);
  const { translations } = useTranslations();
  const {
    data: topics,
    isLoading: isTopicsLoading,
    isError: isTopicsError,
  } = useRMTopics(selectedTeamId);

  const form = useForm({
    initialValues: {
      name: "",
      keywords: [],
    },
    validate: {
      name: (value) => (value.trim().length > 0 ? null : "Name is required"),
      keywords: (value) =>
        value.length > 0
          ? null
          : translations["Atleast one keyword is required"],
    },
  });

  const createMutation = useCreateRMTopicMutation(selectedTeamId);
  const deleteMutation = useDeleteRMTopicMutation(selectedTeamId);

  function handleClose() {
    form.reset();
    onClose();
  }
  function handleSubmit() {
    if (form.validate().hasErrors) return;
    createMutation.mutate({ ...form.values, teamId: selectedTeamId });
  }
  function toggle(topicId: string) {
    if (expandedTopics.includes(topicId)) {
      etHandlers.filter((id) => id !== topicId);
    } else {
      etHandlers.append(topicId);
    }
  }

  if (isTopicsLoading) return <RateupLoader />;
  if (isTopicsError) return <div>{translations["error"]}</div>;

  const sortedEntitiesSelectData = Object.entries(entities)
    .sort((a, b) => b[1].count - a[1].count)
    .map(([key, { count }]) => ({ value: key, label: `${key} (${count})` }));

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={translations["Manage Topics"]}
      size="lg"
      styles={{
        title: {
          fontWeight: 600,
        },
      }}
    >
      <Group align="stretch" mih="50vh">
        <Stack
          style={{
            flex: 1,
          }}
        >
          <Text>{translations["Existing Topics"]}</Text>

          <Stack
            bg="whitesmoke"
            p="xs"
            style={{
              borderRadius: "4px",
              flexGrow: 1,
            }}
          >
            {topics.map((topic) => (
              <Paper key={topic.id} p="sm" radius={"md"}>
                <Group justify="space-between">
                  <Text>{topic.name}</Text>
                  <Group>
                    <ActionIcon
                      variant="transparent"
                      onClick={() => deleteMutation.mutate(topic.id)}
                      c="red"
                      loading={deleteMutation.isPending}
                    >
                      <IconTrash />
                    </ActionIcon>
                    <ActionIcon
                      variant="transparent"
                      onClick={() => toggle(topic.id)}
                    >
                      {expandedTopics.includes(topic.id) ? (
                        <IconChevronUp />
                      ) : (
                        <IconChevronDown />
                      )}
                    </ActionIcon>
                  </Group>
                </Group>
                {expandedTopics.includes(topic.id) && (
                  // TODO: add update mutation
                  <MultiSelect
                    value={topic.keywords.map((keyword) => keyword)}
                    searchable={false}
                    clearable={false}
                    limit={5}
                    styles={{
                      input: {
                        height: 100,
                      },
                    }}
                  />
                )}
              </Paper>
            ))}
          </Stack>
        </Stack>
        <Stack
          style={{
            flex: 1,
          }}
        >
          <Text>{translations["Add Topic"]}</Text>
          <TextInput
            label={translations["Topic Name"]}
            placeholder={translations["Enter topic name"]}
            required
            {...form.getInputProps("name")}
          />
          <MultiSelect
            label={translations["Keywords"]}
            placeholder={translations["Search for keywords to track"]}
            required
            data={sortedEntitiesSelectData}
            limit={5}
            clearable
            searchable
            aria-required
            {...form.getInputProps("keywords")}
            styles={{
              input: {
                height: 100,
              },
            }}
          />
          <Button onClick={handleSubmit} loading={createMutation.isPending}>
            {translations["Add"]}
          </Button>
        </Stack>
      </Group>
    </Modal>
  );
}
