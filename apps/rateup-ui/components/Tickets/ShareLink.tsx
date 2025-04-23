import { useState } from "react";
import { useRouter } from "next/router";

import {
  ActionIcon,
  Box,
  Button,
  Group,
  Modal,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { useClipboard } from "@mantine/hooks";
import { IconCheck, IconCopy, IconShare } from "@tabler/icons-react";

export default function ShareLink() {
  const [opened, setOpened] = useState(false);
  const clipboard = useClipboard({ timeout: 1500 });
  const router = useRouter();

  const currentURL =
    typeof window !== "undefined"
      ? `${window.location.origin}${router.asPath}`
      : "";

  return (
    <>
      {/* Share icon only */}
      <Box>
        <Group gap={4} align="center">
          <Text size="sm" c="gray.6">
            Share:
          </Text>
          <ActionIcon
            variant="transparent"
            onClick={() => setOpened(true)}
            aria-label="Share"
          >
            <IconShare size={20} />
          </ActionIcon>
        </Group>
      </Box>

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
