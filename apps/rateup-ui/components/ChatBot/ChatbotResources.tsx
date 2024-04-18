import {
  ActionIcon,
  Anchor,
  Checkbox,
  Flex,
  ScrollAreaAutosize,
  Stack,
  Table,
} from "@mantine/core";
import {
  useDeleteChatborResource,
  useDeleteManyChatborResource,
  useGetChatbotResources,
} from "../../backend/chatbot/chatbot.query";
import PaperLayout from "../styled/Layouts/PaperLayout";
import { ChatBotDataSourceType } from "../../types/enums";
import { getFileUrlFromKey } from "../../utils/file-upload/upload";
import { useState } from "react";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { RateupButtonBlue } from "../Button/RateupButtons";
import UploadChatbotSource from "./UploadChatbotSource";
import { useDisclosure } from "@mantine/hooks";
import { showLoadingToast } from "../../utils/notifications";
import NothingFound from "../NothingFound/NothingFound";
import { ChatbotResourses } from "../../backend/chatbot/chatbot.api";

const ChatbotResources = ({}) => {
  const { data: chatbotResourses } = useGetChatbotResources();
  const [selectedSources, setSelectedSources] = useState<ChatbotResourses[]>(
    [],
  );
  const [opened, { open, close }] = useDisclosure(false);
  const deleteSourceMutation = useDeleteChatborResource();
  const deleteManySourceMutation = useDeleteManyChatborResource();
  const handleDelete = (source) => {
    showLoadingToast(
      "Hold on..Source getting deleted",
      "source",
      true,
      "Deleting",
    );
    deleteSourceMutation.mutate(source);
  };
  const handleDeleteMany = () => {
    if (!selectedSources.length) return;
    showLoadingToast(
      "Hold on..Sources getting deleted",
      "source",
      true,
      "Deleting",
    );
    deleteManySourceMutation.mutate(selectedSources, {
      onSettled: () => {
        setSelectedSources([]);
      },
    });
  };

  const rows = chatbotResourses?.map((source) => (
    <Table.Tr
      key={source.contentSource}
      bg={
        selectedSources.some((src) => src.contentSource == source.contentSource)
          ? "var(--mantine-color-blue-light)"
          : undefined
      }
    >
      <Table.Td>
        <Checkbox
          aria-label="Select row"
          checked={selectedSources.some(
            (src) => src.contentSource == source.contentSource,
          )}
          onChange={(event) =>
            setSelectedSources(
              event.currentTarget.checked
                ? [...selectedSources, source]
                : selectedSources.filter(
                    (s) => s.contentSource !== source.contentSource,
                  ),
            )
          }
        />
      </Table.Td>
      <Table.Td>
        <Anchor
          href={
            source?.contentType === ChatBotDataSourceType.FILE
              ? getFileUrlFromKey(source?.contentSource, true)
              : source?.contentSource
          }
          target="_blank"
        >
          {source?.contentSource}
        </Anchor>
      </Table.Td>
      <Table.Td>{source.contentType}</Table.Td>
      <Table.Td>
        <ActionIcon variant="subtle" onClick={() => handleDelete(source)}>
          <IconTrash color="red" size={"1rem"} />
        </ActionIcon>
      </Table.Td>
    </Table.Tr>
  ));
  return (
    <Stack>
      <Flex justify={"flex-end"} gap={"sm"}>
        {selectedSources.length > 0 ? (
          <RateupButtonBlue
            title="Delete Resources"
            color="red"
            rightIcon={<IconTrash size={"1rem"} />}
            onClick={handleDeleteMany}
          />
        ) : null}
        <RateupButtonBlue
          title="Upload New"
          rightIcon={<IconPlus />}
          onClick={open}
        />
      </Flex>
      <PaperLayout>
        {chatbotResourses?.length > 0 ? (
          <ScrollAreaAutosize mah={395}>
            <Table stickyHeader>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th />
                  <Table.Th>Source</Table.Th>
                  <Table.Th>Type</Table.Th>
                  <Table.Th>Action</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>{rows}</Table.Tbody>
            </Table>
          </ScrollAreaAutosize>
        ) : (
          <NothingFound text="No Resources uploaded" />
        )}
      </PaperLayout>
      <UploadChatbotSource opened={opened} close={close} />
    </Stack>
  );
};

export default ChatbotResources;
