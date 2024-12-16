import { ActionIcon, Group } from "@mantine/core";
import { IconDeviceAudioTape, IconDownload } from "@tabler/icons-react";

import { useGetMediaFile } from "@/backend/whatsapp/inbox/message/wamessage.query";
import { showErrorToast } from "@/utils/notifications";

interface Props {
  messageContent: string;
}

export default function WaInboxVideo({ messageContent }: Props) {
  const { data, mutate, isSuccess, isPending } = useGetMediaFile();

  const handleVideoError = () => {
    showErrorToast(
      "Video file not found",
      "error-video-not-found",
      <IconDeviceAudioTape />,
    );
  };

  const handleDownload = () => {
    mutate(messageContent);
  };

  return (
    <Group pt={"xs"} align="center" pos={"relative"}>
      {data && isSuccess ? (
        <video controls style={{ width: "100%" }} onError={handleVideoError}>
          <source src={data} type="video/mp4" />
          Your browser does not support the video element.
        </video>
      ) : (
        <>
          <video controls style={{ flex: 1 }}>
            <source src={data || ""} type="video/mp4" />
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
          >
            <IconDownload />
          </ActionIcon>
        </>
      )}
    </Group>
  );
}
