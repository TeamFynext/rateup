import { IconDownload } from "@tabler/icons-react";
import type { JSX } from "react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { useGetMediaFile } from "@/backend/whatsapp/inbox/message/wamessage.query";
import { Button } from "@/components/ui/button.tsx";

interface Props {
  messageContent: string;
}

export default function WaInboxAudio({ messageContent }: Props): JSX.Element {
  const { mutate, isPending } = useGetMediaFile();
  const [id] = messageContent.split("_caption_");
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioLoaded, setAudioLoaded] = useState(false);
  const link = messageContent.startsWith("http")
    ? messageContent
    : id.startsWith("http")
      ? id
      : null;

  const handleAudioError = () => {
    toast.error("Audio file not found", {
      id: "error-audio-not-found",
    });
  };

  const handleDownload = () => {
    mutate(id, {
      onSuccess: (fileData) => {
        const blob = new Blob([fileData], { type: "audio/ogg" });
        const url = URL.createObjectURL(blob);

        if (audioRef.current) {
          audioRef.current.src = url;
          audioRef.current.load();
          audioRef.current.play().catch((err) => {
            console.error("Failed to play audio:", err);
          });
          setAudioLoaded(true);
        }
      },
      onError: (error) => {
        toast.error(error?.message || "Failed to download audio file", {
          id: "error-audio-download",
        });
      },
    });
  };

  return (
    <div className="relative flex items-center pt-2 w-full gap-2">
      <audio
        ref={audioRef}
        controls
        className="flex-1"
        onError={audioRef?.current?.src ? handleAudioError : undefined}
      >
        <source type="audio/ogg" src={link ?? ""} />
        Your browser does not support the audio element.
      </audio>
      {!link && !audioLoaded && (
        <Button
          size="icon"
          className="absolute right-2 rounded-full h-8 w-8 shrink-0"
          onClick={handleDownload}
          aria-label="Download Audio"
          loading={isPending}
        >
          <IconDownload size={16} />
        </Button>
      )}
    </div>
  );
}
