import { JSX, useRef } from "react";

import { ActionIcon, Group } from "@mantine/core";
import { IconDeviceAudioTape, IconDownload } from "@tabler/icons-react";

import { useGetMediaFile } from "@/backend/whatsapp/inbox/message/wamessage.query";
import { showErrorToast } from "@/utils/notifications";

interface Props {
  messageContent: string;
}

export default function WaInboxAudio({ messageContent }: Props): JSX.Element {
  const { mutate, isPending } = useGetMediaFile();
  const [id, caption] = messageContent.split("_caption_");
  const audioRef = useRef<HTMLAudioElement>(null);
  const link = messageContent.startsWith("http")
    ? messageContent
    : id.startsWith("http")
      ? id
      : null;

  const handleAudioError = () => {
    showErrorToast(
      "Audio file not found",
      "error-audio-not-found",
      <IconDeviceAudioTape />,
    );
  };

  const handleDownload = () => {
    mutate(id, {
      onSuccess: (fileData) => {
        // Create a Blob URL from the fetched audio data
        const blob = new Blob([fileData], { type: "audio/ogg" });
        const url = URL.createObjectURL(blob);

        // Play the audio automatically
        if (audioRef.current) {
          audioRef.current.src = url;
          audioRef.current.load();
          audioRef.current.play().catch((err) => {
            console.error("Failed to play audio:", err);
          });
        }
      },
      onError: () => {
        showErrorToast(
          "Failed to download audio file",
          "error-audio-download",
          <IconDeviceAudioTape />,
        );
      },
    });
  };

  return (
    <Group pt={"xs"} align="center" pos={"relative"}>
      <audio
        ref={audioRef}
        controls
        style={{ flex: 1 }}
        onError={audioRef?.current?.src ? handleAudioError : undefined}
      >
        <source type="audio/ogg" src={link} />
        Your browser does not support the audio element.
      </audio>
      {!link && (
        <ActionIcon
          pos={"absolute"}
          right={10}
          radius={"xl"}
          size={"lg"}
          onClick={handleDownload}
          aria-label="Download Audio"
          loading={isPending}
          display={audioRef?.current?.src ? "none" : "flex"}
        >
          <IconDownload />
        </ActionIcon>
      )}
    </Group>
  );
}
