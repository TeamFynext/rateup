import { ActionIcon, Group } from "@mantine/core";
import { IconDeviceAudioTape, IconDownload } from "@tabler/icons-react";

import { useGetMediaFile } from "@/backend/whatsapp/inbox/message/wamessage.query";
import { showErrorToast } from "@/utils/notifications";

interface Props {
  messageContent: string;
}

export default function WaInboxAudio({ messageContent }: Props) {
  const { data, mutate, isSuccess, isPending } = useGetMediaFile();

  const handleAudioError = () => {
    showErrorToast(
      "Audio file not found",
      "error-audio-not-found",
      <IconDeviceAudioTape />,
    );
  };

  const handleDownload = () => {
    mutate(messageContent);
  };

  return (
    <Group pt={"xs"} align="center" pos={"relative"}>
      {data && isSuccess ? (
        <audio controls style={{ flex: 1 }} onError={handleAudioError}>
          <source src={data} type="audio/mpeg" />
          Your browser does not support the audio element.
        </audio>
      ) : (
        <>
          <audio controls style={{ flex: 1 }}>
            <source src={data || ""} type="audio/mpeg" />
            Your browser does not support the audio element.
          </audio>
          <ActionIcon
            pos={"absolute"}
            right={10}
            radius={"xl"}
            size={"lg"}
            onClick={handleDownload}
            aria-label="Download Audio"
            loading={isPending}
          >
            <IconDownload />
          </ActionIcon>
        </>
      )}
    </Group>
  );
}
