"use client";

import { useState } from "react";

import { RichTextEditor } from "@mantine/tiptap";
import { IconFile, IconUpload, IconX } from "@tabler/icons-react";
import { toast } from "sonner";

import { RateupButtonPrimary } from "@/components/Button/RateupButtons";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useMediaStore } from "@/components/whatsapp/inbox/chatdisplay/chatdisplayFooter";
import { uploadFile } from "@/utils/file-upload/upload";

const InsertInboxFile = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [isUploadingFile, setIsUploadingFile] = useState(false);

  const { addMedia, media, resetMedia } = useMediaStore();

  function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files || []);
    setFiles((prev) => [...prev, ...selected]);
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  async function onSubmit() {
    if (!files.length) return;

    setIsUploadingFile(true);

    try {
      for (const file of files) {
        const fileKey = await uploadFile(file);
        const fileUrl = `${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${fileKey}`;

        addMedia({
          type: "document",
          name: file.name,
          url: fileUrl,
          key: fileKey,
        });
      }

      setFiles([]);
    } catch (e) {
      const errorMessage =
        e instanceof Error
          ? e.message
          : String(e || "Failed to upload file. Please try again.");
      toast.error(errorMessage || "Failed to upload file. Please try again.");
      resetMedia();
    }

    setIsUploadingFile(false);
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <RichTextEditor.Control
          aria-label="Insert File"
          title="Insert File"
          disabled={isUploadingFile || media.length > 0}
        >
          <IconFile size={16} />
        </RichTextEditor.Control>
      </PopoverTrigger>

      <PopoverContent className="w-64 flex flex-col gap-2">
        <Button variant="outline" size="sm" asChild>
          <label className="cursor-pointer">
            <div className="flex items-center justify-center gap-1">
              <IconFile size={16} />
              Select Files
            </div>
            <input
              type="file"
              multiple
              accept="text/plain,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
              className="hidden"
              onChange={handleSelect}
            />
          </label>
        </Button>

        {/* File list */}
        {files.map((file, index) => (
          <div
            key={index}
            className="flex items-center justify-between text-sm border rounded px-2 py-1"
          >
            <span className="truncate max-w-[180px]">{file.name}</span>

            <button onClick={() => removeFile(index)}>
              <IconX size={14} />
            </button>
          </div>
        ))}

        <RateupButtonPrimary
          loading={isUploadingFile}
          title="Upload"
          onClick={onSubmit}
          rightIcon={<IconUpload size="1rem" />}
          size="sm"
          disabled={!files.length}
        />
      </PopoverContent>
    </Popover>
  );
};

export default InsertInboxFile;
