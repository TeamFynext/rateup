"use client";

import React, { useState } from "react";

import {
  ActionIcon,
  Collapse,
  Flex,
  Group,
  Loader,
  Popover,
  Stack,
  Text,
} from "@mantine/core";
import { isNotEmpty, useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { RichTextEditor, useRichTextEditorContext } from "@mantine/tiptap";
import {
  IconMessage2Bolt,
  IconPencil,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";

import { useWaQuickReplies } from "@/backend/whatsapp/inbox/quickReply/quickreply.query";
import {
  RateupButtonPrimary,
  RateupButtonSecondary,
} from "@/components/Button/RateupButtons";
import Reorder from "@/components/Linktree/LinktreeEditor/LinksEditor/components/Reorder";
import ReorderItem from "@/components/Linktree/LinktreeEditor/LinksEditor/components/Reorder/ReorderItem";

import WaTextEditor, { parseToWhatsAppFormat } from "../waTextEditor";
import styles from "./quickeReply.module.css";

const WaQuickReplyControl = () => {
  const { editor } = useRichTextEditorContext();
  const [opened, setOpened] = useState(false);
  return (
    <Popover position="top" opened={opened} onChange={setOpened}>
      <Popover.Target>
        <RichTextEditor.Control
          title="Insert quick replies"
          onClick={() => setOpened((o) => !o)}
        >
          <IconMessage2Bolt size={16} />
        </RichTextEditor.Control>
      </Popover.Target>
      <Popover.Dropdown>
        <WaQuickReply
          handleSelectQuickReply={(value) => {
            if (editor) {
              editor.commands.insertContent(value);
              setOpened((o) => !o);
            }
          }}
        />
      </Popover.Dropdown>
    </Popover>
  );
};

const WaQuickReply = ({ handleSelectQuickReply }) => {
  const {
    waQuickReplies,
    updateQuickReplyOrder,
    deleteQuickReplyById,
    updateQuickReply,
    createQuickReply,
  } = useWaQuickReplies();
  const [opened, { toggle }] = useDisclosure(false);
  const [updateOpend, { toggle: updateToggle }] = useDisclosure(false);
  const [selectedReplyId, setSelectedReplyId] = useState("");

  function handleDragEnd(orderedReplies) {
    const data = orderedReplies.map((r, index) => ({
      id: r.id,
      priority: index + 1,
    }));
    updateQuickReplyOrder.mutate(data);
  }

  function handleDelete(replyId) {
    if (!replyId) return;
    deleteQuickReplyById.mutate(replyId);
  }

  function handleUpdate(id, data, onClose) {
    updateQuickReply.mutate(
      { id, data },
      {
        onSettled: () => {
          onClose();
          setSelectedReplyId("");
        },
      },
    );
  }

  function handleCreate(data, onClose) {
    createQuickReply.mutate(data, {
      onSettled: () => {
        onClose();
      },
    });
  }
  const quickReplies = waQuickReplies?.data ? waQuickReplies?.data : [];

  if (waQuickReplies.isPending) return <Loader type="dots" />;
  return (
    <Stack>
      <Flex justify={"flex-end"}>
        <RateupButtonPrimary
          title="Add Quick Reply"
          leftIcon={<IconPlus size={16} />}
          size="xs"
          onClick={toggle}
        />
      </Flex>
      <Collapse in={opened}>
        <WaQuickReplyEditor
          onClick={(value, onClose) =>
            handleCreate(
              { text: value, priority: quickReplies.length + 1 },
              onClose,
            )
          }
          loading={createQuickReply.isPending}
          close={toggle}
        />
      </Collapse>
      {quickReplies.length > 0 ? (
        <Reorder
          onDragEnd={handleDragEnd}
          itemsArr={waQuickReplies.data}
          className={styles["cards-container-div"]}
        >
          {quickReplies.map((quickReply, index) => {
            return updateOpend && quickReply.id === selectedReplyId ? (
              <Collapse in={updateOpend}>
                <WaQuickReplyEditor
                  onClick={(value, onClose) =>
                    handleUpdate(quickReply.id, { text: value }, onClose)
                  }
                  initialValues={{ text: quickReply.text }}
                  close={updateToggle}
                  loading={updateQuickReply.isPending}
                />
              </Collapse>
            ) : (
              <ReorderItem key={quickReply.id} id={quickReply.id} index={index}>
                <Group
                  onClick={() => handleSelectQuickReply(quickReply.text)}
                  style={{ cursor: "pointer" }}
                  justify="space-between"
                >
                  <Text size="sm" w={500}>
                    {quickReply.text}
                  </Text>
                  <Group gap={2} px={"sm"}>
                    <ActionIcon
                      variant="subtle"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedReplyId(quickReply.id);
                        handleDelete(quickReply.id);
                      }}
                      loading={
                        deleteQuickReplyById.isPending &&
                        selectedReplyId === quickReply.id
                      }
                    >
                      <IconTrash size={"1rem"} />
                    </ActionIcon>
                    <ActionIcon
                      variant="subtle"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedReplyId(quickReply.id);
                        updateToggle();
                      }}
                    >
                      <IconPencil size={"1rem"} />
                    </ActionIcon>
                  </Group>
                </Group>
              </ReorderItem>
            );
          })}
        </Reorder>
      ) : (
        !opened && <Text size="sm">No quick replies found</Text>
      )}
    </Stack>
  );
};

const WaQuickReplyEditor = ({
  onClick,
  loading,
  close,
  initialValues = null,
}) => {
  const form = useForm({
    initialValues: initialValues ?? {
      text: "",
    },
    validate: {
      text: isNotEmpty("Message cannot be empty"),
    },
  });

  function handleSave() {
    if (form.validate().hasErrors) return;
    onClick(parseToWhatsAppFormat(form.values.text), onClose);
  }

  function onClose() {
    form.reset();
    close();
  }

  return (
    <Stack gap={"xs"}>
      <WaTextEditor
        handleInputChange={(value) => form.setFieldValue("text", value)}
        content={form.values.text}
        mah={50}
      />
      <Group justify={"flex-end"} gap={"xs"}>
        <RateupButtonSecondary
          title="Cancel"
          size="xs"
          radius={"md"}
          onClick={onClose}
        />
        <RateupButtonPrimary
          title="Save"
          size="xs"
          radius={"md"}
          onClick={handleSave}
          loading={loading}
        />
      </Group>
    </Stack>
  );
};

export default WaQuickReplyControl;
