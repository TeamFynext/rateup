import { IconMusic, IconPaperclip, IconPhoto, IconVideo, IconX } from "@tabler/icons-react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import type { QuickReplyMedia } from "@/backend/whatsapp/inbox/quickReply/quickreply.api";
import { Button } from "@/components/ui/button.tsx";
import { uploadFile } from "@/utils/file-upload/upload.ts";

export const MAX_QUICK_REPLY_MEDIA = 5;

/**
 * 10 MB at most, and WhatsApp's own image limit below that, so a saved reply
 * cannot fail at send time. Same types the composer's own pickers take.
 */
const KINDS: { type: QuickReplyMedia["type"]; mimes: string[]; maxMb: number }[] = [
  { type: "image", mimes: ["image/png", "image/jpeg"], maxMb: 5 },
  {
    type: "audio",
    mimes: ["audio/aac", "audio/amr", "audio/mpeg", "audio/mp4", "audio/ogg"],
    maxMb: 10,
  },
  { type: "video", mimes: ["video/mp4", "video/3gpp"], maxMb: 10 },
];
const ACCEPT = KINDS.flatMap((k) => k.mimes).join(",");

const ICONS = { image: IconPhoto, audio: IconMusic, video: IconVideo } as const;

/**
 * The quick reply's attachments. Uploads go to storage straight away; `onUploaded`
 * reports each key so the form can delete what it uploaded if it is closed unsaved.
 */
export default function QuickReplyMediaField({
  value,
  onChange,
  onUploaded,
  onRemoveUnsaved,
}: Readonly<{
  value: QuickReplyMedia[];
  onChange: (media: QuickReplyMedia[]) => void;
  onUploaded: (key: string) => void;
  /** Removing a file uploaded in this session deletes it now; a saved one goes on save. */
  onRemoveUnsaved: (key: string) => void;
}>) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const isFull = value.length >= MAX_QUICK_REPLY_MEDIA;

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    const room = MAX_QUICK_REPLY_MEDIA - value.length;
    const picked = Array.from(files).slice(0, room);
    if (files.length > room) {
      toast.error(t("Up to {count} attachments per quick reply", { count: MAX_QUICK_REPLY_MEDIA }));
    }

    setUploading(true);
    const added: QuickReplyMedia[] = [];
    for (const file of picked) {
      const kind = KINDS.find((k) => k.mimes.includes(file.type));
      if (!kind) {
        toast.error(t("{name} is not a supported image, audio or video file", { name: file.name }));
        continue;
      }
      if (file.size > kind.maxMb * 1024 * 1024) {
        toast.error(t("{name} is larger than {size} MB", { name: file.name, size: kind.maxMb }));
        continue;
      }
      try {
        const key = await uploadFile(file);
        onUploaded(key);
        added.push({
          type: kind.type,
          key,
          name: file.name,
          url: `${import.meta.env.VITE_AWS_CLOUDFRONT_URL}${key}`,
        });
      } catch (error) {
        toast.error(typeof error === "string" ? error : t("Upload failed"));
      }
    }
    setUploading(false);
    if (added.length) onChange([...value, ...added]);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="flex flex-col gap-2">
      {value.length > 0 && (
        <ul className="grid gap-2 sm:grid-cols-2">
          {value.map((media) => {
            const Icon = ICONS[media.type];
            return (
              <li
                key={media.key}
                className="flex min-w-0 items-center gap-2.5 rounded-lg border border-border p-1.5"
              >
                {media.type === "image" ? (
                  <img src={media.url} alt="" className="size-9 shrink-0 rounded object-cover" />
                ) : (
                  <span className="flex size-9 shrink-0 items-center justify-center rounded bg-muted">
                    <Icon className="size-4 text-muted-foreground" />
                  </span>
                )}
                <a
                  href={media.url}
                  target="_blank"
                  rel="noreferrer"
                  className="min-w-0 flex-1 truncate text-sm hover:underline"
                  title={t("Open {name}", { name: media.name })}
                >
                  {media.name}
                </a>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t("Remove attachment")}
                  onClick={() => {
                    onRemoveUnsaved(media.key);
                    onChange(value.filter((m) => m.key !== media.key));
                  }}
                >
                  <IconX />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {!isFull && (
          <>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              multiple
              hidden
              onChange={(e) => void handleFiles(e.target.files)}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              loading={uploading}
              onClick={() => inputRef.current?.click()}
            >
              <IconPaperclip />
              {t("Attach image, audio or video")}
            </Button>
          </>
        )}
        <span className="text-xs text-muted-foreground">
          {t("Images up to 5 MB, audio and video up to 10 MB")}
        </span>
      </div>
    </div>
  );
}
