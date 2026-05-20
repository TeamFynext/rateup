"use client";

import { useState } from "react";

import { RichTextEditor } from "@mantine/tiptap";
import { IconMusic, IconUpload, IconX } from "@tabler/icons-react";
import { toast } from "sonner";

import { RateupButtonPrimary } from "@/components/Button/RateupButtons.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";
import { useMediaStore } from "@/components/whatsapp/inbox/chatdisplay/chatdisplayFooter/index.tsx";
import { uploadFile } from "@/utils/file-upload/upload.ts";

const InsertInboxAudio = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);

  const { addMedia, media, resetMedia } = useMediaStore();

  function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (selected) setFile(selected);
  }

  function removeFile() {
    setFile(null);
  }

  async function onSubmit() {
    if (!file) return;

    setIsUploadingFile(true);

    try {
      const fileKey = await uploadFile(file);
      const fileUrl = `${import.meta.env.VITE_AWS_CLOUDFRONT_URL}${fileKey}`;

      addMedia({
        type: "audio",
        name: file.name,
        url: fileUrl,
        key: fileKey,
      });

      setFile(null);
    } catch (e) {
      const errorMessage =
        e instanceof Error
          ? e.message
          : String(e || "Failed to upload audio. Please try again.");
      toast.error(errorMessage || "Failed to upload audio. Please try again.");
      resetMedia();
    }

    setIsUploadingFile(false);
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <RichTextEditor.Control
          aria-label="Upload audio"
          title="Upload Audio"
          disabled={isUploadingFile || media.length > 0}
        >
          <IconMusic size={16} />
        </RichTextEditor.Control>
      </PopoverTrigger>

      <PopoverContent className="w-64 flex flex-col gap-2">
        <Button variant="outline" size="sm" asChild>
          <label className="cursor-pointer">
            <div className="flex items-center justify-center gap-1">
              <IconMusic size={16} />
              Select Audio
            </div>
            <input
              type="file"
              accept="audio/aac,audio/amr,audio/mpeg,audio/mp4,audio/ogg"
              className="hidden"
              onChange={handleSelect}
            />
          </label>
        </Button>

        {/* Selected file */}
        {file && (
          <div className="flex items-center justify-between text-sm border rounded px-2 py-1">
            <span className="truncate max-w-[180px]">{file.name}</span>

            <button onClick={removeFile}>
              <IconX size={14} />
            </button>
          </div>
        )}

        <RateupButtonPrimary
          loading={isUploadingFile}
          title="Upload"
          onClick={onSubmit}
          rightIcon={<IconUpload size="1rem" />}
          size="sm"
          disabled={!file}
        />
      </PopoverContent>
    </Popover>
  );
};

export default InsertInboxAudio;
