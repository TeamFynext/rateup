"use client";

import { useState } from "react";

import { RichTextEditor } from "@mantine/tiptap";
import { IconUpload, IconVideo, IconX } from "@tabler/icons-react";

import { RateupButtonPrimary } from "@/components/Button/RateupButtons";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useMediaStore } from "@/components/whatsapp/inbox/chatdisplay/chatdisplayFooter";
import { uploadFile } from "@/utils/file-upload/upload";
import { showErrorToast } from "@/utils/notifications";

const InsertInboxVideo = () => {
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
      const fileUrl = `${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${fileKey}`;

      addMedia({
        type: "video",
        name: file.name,
        url: fileUrl,
        key: fileKey,
      });

      setFile(null);
    } catch (e) {
      showErrorToast(e);
      resetMedia();
    }

    setIsUploadingFile(false);
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <RichTextEditor.Control
          aria-label="Upload Video"
          title="Upload Video"
          disabled={isUploadingFile || media.length > 0}
        >
          <IconVideo size={16} />
        </RichTextEditor.Control>
      </PopoverTrigger>

      <PopoverContent className="w-64 flex flex-col gap-2">
        <Button variant="outline" size="sm" asChild>
          <label className="cursor-pointer">
            <div className="flex items-center justify-center gap-1">
              <IconVideo size={16} />
              Select Video
            </div>
            <input
              type="file"
              accept="video/3gpp,video/mp4"
              className="hidden"
              onChange={handleSelect}
            />
          </label>
        </Button>

        {/* Selected video */}
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

export default InsertInboxVideo;
