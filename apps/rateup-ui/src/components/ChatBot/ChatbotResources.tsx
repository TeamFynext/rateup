"use client";

import { useState } from "react";

import {
  ActionIcon,
  Anchor,
  Checkbox,
  Flex,
  ScrollAreaAutosize,
  Stack,
  Table,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { ChatBotDataSourceType } from "@/types/enums.ts";
import type { ChatbotResourses } from "@/backend/chatbot/chatbot.api";
import {
  useDeleteChatborResource,
  useDeleteManyChatborResource,
  useGetChatbotResources,
} from "@/backend/chatbot/chatbot.query";
import { getFileUrlFromKey } from "@/utils/file-upload/upload.ts";

import { RateupButtonBlue } from "../Button/RateupButtons.tsx";
import NothingFound from "../NothingFound/NothingFound.tsx";
import PaperLayout from "../styled/Layouts/PaperLayout.tsx";
import UploadChatbotSource from "./UploadChatbotSource.tsx";

const ChatbotResources = ({ enableApi, selectedChatbotId }) => {
  const { data: chatbotResourses } = useGetChatbotResources(
    enableApi,
    selectedChatbotId,
  );
  const { t: translations } = useTranslation();
  const [selectedSources, setSelectedSources] = useState<ChatbotResourses[]>(
    [],
  );
  const [opened, { open, close }] = useDisclosure(false);
  const deleteSourceMutation = useDeleteChatborResource();
  const deleteManySourceMutation = useDeleteManyChatborResource();
  const handleDelete = (source) => {
    toast.loading(translations("Hold on..Source getting deleted"), {
      id: "source",
    });
    deleteSourceMutation.mutate(source);
  };
  const handleDeleteMany = () => {
    if (!selectedSources.length) return;
    toast.loading(translations("Hold on..Sources getting deleted"), {
      id: "source",
    });
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
          aria-label={translations("Select row")}
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
            title={translations("Delete Resources")}
            color="red"
            rightIcon={<IconTrash size={"1rem"} />}
            onClick={handleDeleteMany}
          />
        ) : null}
        <RateupButtonBlue
          title={translations("Upload New")}
          rightIcon={<IconPlus />}
          onClick={open}
        />
      </Flex>
      <PaperLayout h={"100%"}>
        {chatbotResourses?.length > 0 ? (
          <ScrollAreaAutosize mah={395}>
            <Table stickyHeader>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th />
                  <Table.Th>{translations("Source")}</Table.Th>
                  <Table.Th>{translations("Type")}</Table.Th>
                  <Table.Th>{translations("Action")}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>{rows}</Table.Tbody>
            </Table>
          </ScrollAreaAutosize>
        ) : (
          <NothingFound text={translations("No Resources uploaded")} />
        )}
      </PaperLayout>
      <UploadChatbotSource
        selectedChatbotId={selectedChatbotId}
        opened={opened}
        close={close}
      />
    </Stack>
  );
};

export default ChatbotResources;
