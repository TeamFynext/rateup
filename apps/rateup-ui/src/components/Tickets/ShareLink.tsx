"use client";

import { useState } from "react";

import {
  ActionIcon,
  Button,
  Group,
  Modal,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { useClipboard } from "@mantine/hooks";
import { IconCheck, IconCopy, IconShare } from "@tabler/icons-react";

import { useCurrentPath } from "@/hooks/currentPath.tsx";

import { RateupButtonBlue } from "../Button/RateupButtons.tsx";

export default function ShareLink() {
  const [opened, setOpened] = useState(false);
  const clipboard = useClipboard({ timeout: 1500 });
  const currentRoutePath = useCurrentPath();

  const currentURL =
    typeof window !== "undefined"
      ? `${window.location.origin}${currentRoutePath}`
      : "";

  return (
    <>
      {/* Share icon only */}
      <RateupButtonBlue
        title="Share"
        onClick={() => setOpened(true)}
        leftIcon={<IconShare size={20} />}
        radius={"sm"}
        pl="xs"
        pr="xs"
      />

      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title="Share this page"
        centered
      >
        <TextInput
          value={currentURL}
          readOnly
          label="Page URL"
          rightSection={
            <Tooltip
              label={clipboard.copied ? "Copied" : "Copy"}
              position="top-end"
              withArrow
            >
              <ActionIcon
                variant="subtle"
                onClick={() => clipboard.copy(currentURL)}
              >
                {clipboard.copied ? (
                  <IconCheck size={16} color="green" />
                ) : (
                  <IconCopy size={16} />
                )}
              </ActionIcon>
            </Tooltip>
          }
        />

        <Group justify="right" mt="md">
          <Button variant="light" size="sm" onClick={() => setOpened(false)}>
            Close
          </Button>
        </Group>
      </Modal>
    </>
  );
}
