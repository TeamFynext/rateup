"use client";

import { useEffect, useState } from "react";

import { ActionIcon, Group, Stack, Text } from "@mantine/core";
import {
  IconDeviceAudioTape,
  IconDownload,
  IconFile,
  IconFileAnalytics,
} from "@tabler/icons-react";

import { useGetMediaFile } from "@/backend/whatsapp/inbox/message/wamessage.query";
import PaperLayout from "@/components/styled/Layouts/PaperLayout";
import { showErrorToast } from "@/utils/notifications";

interface Props {
  messageContent: string;
}

export default function WaInboxDocument({ messageContent }: Props) {
  const { mutate, isPending } = useGetMediaFile();
  const [documentSrc, setDocumentSrc] = useState<string | null>(null);
  const [link, filename, caption] = messageContent.split("_caption_");

  useEffect(() => {
    if (messageContent && messageContent.startsWith("http")) {
      setDocumentSrc(messageContent);
    }
  }, [messageContent]);

  const handleDownload = () => {
    mutate(link, {
      onSuccess: (fileData) => {
        // Create a Blob URL from the fetched document data
        const blob = new Blob([fileData]);
        const url = URL.createObjectURL(blob);
        setDocumentSrc(url);

        // Automatically download the document
        const link = document.createElement("a");
        link.href = url;
        link.download = filename ?? "document.pdf";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      },
      onError: () => {
        showErrorToast(
          "Failed to download document file",
          "error-document-download",
          <IconDeviceAudioTape />,
        );
      },
    });
  };

  return (
    <Group
      pt={"xs"}
      align="center"
      pos={"relative"}
      style={{ flexDirection: "column", alignItems: "center" }}
    >
      <Stack p={0} gap={3}>
        <PaperLayout
          onClick={() => {
            if (!documentSrc) return;
            window.open(documentSrc, "_blank");
          }}
          style={{ cursor: documentSrc && "pointer" }}
          bg={"var(--light-grey-color-6)"}
          shadow="xs"
        >
          <Group justify="space-between">
            <Group gap={1}>
              <IconFileAnalytics size={20} />
              <Text size="sm">{filename}</Text>
            </Group>
            {!documentSrc && (
              <ActionIcon
                radius={"xl"}
                onClick={handleDownload}
                aria-label="Download Document"
                loading={isPending}
              >
                <IconDownload size={"1rem"} />
              </ActionIcon>
            )}
          </Group>
        </PaperLayout>
        <Text>{caption}</Text>
      </Stack>
    </Group>
  );
}
