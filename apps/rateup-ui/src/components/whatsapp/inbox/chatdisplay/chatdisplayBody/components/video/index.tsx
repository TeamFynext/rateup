import { IconDownload } from "@tabler/icons-react";
import { Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { useGetMediaFile } from "@/backend/whatsapp/inbox/message/wamessage.query";
import { Button } from "@/components/ui/button.tsx";

interface Props {
  messageContent: string;
}

export default function WaInboxVideo({ messageContent }: Props) {
  const { mutate, isPending } = useGetMediaFile();
  const [id, caption] = messageContent.split("_caption_");
  const link = id.startsWith("http") ? id : null;
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);

  const handleVideoError = () => {
    toast.error("Video file not found", {
      id: "error-video-not-found",
    });
  };

  const handleDownload = () => {
    mutate(id, {
      onSuccess: (fileData) => {
        const blob = new Blob([fileData], { type: "video/mp4" });
        const url = URL.createObjectURL(blob);

        if (videoRef.current) {
          videoRef.current.load();
          videoRef.current.src = url;
          videoRef.current.play().catch((err) => {
            console.error("Failed to play video:", err);
          });
          setVideoLoaded(true);
        }
      },
      onError: (error) => {
        toast.error(error?.message || "Failed to download video file", {
          id: "error-video-download",
        });
      },
    });
  };

  return (
    <div className="flex flex-col gap-1 p-0">
      <div className="relative flex justify-center items-center pt-2">
        <video
          ref={videoRef}
          controls
          style={{ width: "100%" }}
          onError={videoRef?.current?.src ? handleVideoError : undefined}
        >
          <source type="video/mp4" src={link ?? ""} />
          Your browser does not support the video element.
        </video>
        {!link && !videoLoaded && (
          <Button
            size="icon"
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full h-10 w-10 shrink-0"
            onClick={handleDownload}
            aria-label="Download Video"
            disabled={isPending}
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <IconDownload size={16} />}
          </Button>
        )}
      </div>
      {caption && <p className="text-sm mt-1">{caption}</p>}
    </div>
  );
}
