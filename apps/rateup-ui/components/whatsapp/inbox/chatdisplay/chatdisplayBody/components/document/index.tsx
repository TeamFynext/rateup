import { useState } from "react";

import { ActionIcon, Group, Stack, Text } from "@mantine/core";
import {
  IconDeviceAudioTape,
  IconDownload,
  IconFile,
  IconFileAnalytics,
} from "@tabler/icons-react";

import { useGetMediaFile } from "@/backend/whatsapp/inbox/message/wamessage.query";
import { showErrorToast } from "@/utils/notifications";

interface Props {
  messageContent: string;
}

export default function WaInboxDocument({ messageContent }: Props) {
  const { mutate, isPending } = useGetMediaFile();
  const [documentSrc, setDocumentSrc] = useState<string | null>(null);

  const handleDownload = () => {
    mutate(messageContent, {
      onSuccess: (fileData) => {
        // Create a Blob URL from the fetched document data
        const blob = new Blob([fileData], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        setDocumentSrc(url);

        // Automatically download the document
        const link = document.createElement("a");
        link.href = url;
        link.download = "document.pdf";
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
      {documentSrc ? (
        <Stack>
          <Text
            component="a"
            href={documentSrc}
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <iframe
              src={documentSrc}
              style={{
                width: "100%",
                height: "150px",
                border: "none",
                pointerEvents: "none",
              }}
              title="Document Preview"
            />
            Open Document in New Tab
          </Text>
        </Stack>
      ) : (
        <Group>
          <IconFileAnalytics size={80} />
          <ActionIcon
            pos={"absolute"}
            radius={"xl"}
            right={0}
            bottom={0}
            onClick={handleDownload}
            aria-label="Download Document"
            loading={isPending}
          >
            <IconDownload />
          </ActionIcon>
        </Group>
      )}
    </Group>
  );
}
