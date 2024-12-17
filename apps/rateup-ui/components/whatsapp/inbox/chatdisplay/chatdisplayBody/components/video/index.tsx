import { useRef, useState } from "react";

import { ActionIcon, Group } from "@mantine/core";
import { IconDeviceAudioTape, IconDownload } from "@tabler/icons-react";

import { useGetMediaFile } from "@/backend/whatsapp/inbox/message/wamessage.query";
import { showErrorToast } from "@/utils/notifications";

interface Props {
  messageContent: string;
}

export default function WaInboxVideo({ messageContent }: Props) {
  const { mutate, isPending } = useGetMediaFile();
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleVideoError = () => {
    showErrorToast(
      "Video file not found",
      "error-video-not-found",
      <IconDeviceAudioTape />,
    );
  };

  const handleDownload = () => {
    mutate(messageContent, {
      onSuccess: (fileData) => {
        // Create a Blob URL from the fetched video data
        const blob = new Blob([fileData], { type: "video/mp4" });
        const url = URL.createObjectURL(blob);
        setVideoSrc(url);

        // Play the video automatically
        if (videoRef.current) {
          videoRef.current.load();
          videoRef.current.play().catch((err) => {
            console.error("Failed to play video:", err);
          });
        }
      },
      onError: () => {
        showErrorToast(
          "Failed to download video file",
          "error-video-download",
          <IconDeviceAudioTape />,
        );
      },
    });
  };

  return (
    <Group pt={"xs"} align="center" pos={"relative"}>
      <video
        ref={videoRef}
        controls
        style={{ width: "100%" }}
        onError={videoSrc ? handleVideoError : undefined}
      >
        <source src={videoSrc || ""} type="video/mp4" />
        Your browser does not support the video element.
      </video>
      <ActionIcon
        pos={"absolute"}
        right={"45%"}
        left={"45%"}
        radius={"xl"}
        size={"lg"}
        onClick={handleDownload}
        aria-label="Download Video"
        loading={isPending}
        display={videoSrc ? "none" : "flex"}
      >
        <IconDownload />
      </ActionIcon>
    </Group>
  );
}
