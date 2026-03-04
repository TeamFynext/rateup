"use client";

import { useState } from "react";

import { RichTextEditor } from "@mantine/tiptap";
import { IconPhoto, IconUpload, IconX } from "@tabler/icons-react";

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

const InsertInboxImage = () => {
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

  const { addMedia, media, resetMedia } = useMediaStore();

  async function onSubmit() {
    if (!files.length) return;

    setIsUploadingFile(true);

    try {
      for (const file of files) {
        const fileKey = await uploadFile(file);
        const fileUrl = `${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${fileKey}`;

        addMedia({
          type: "image",
          name: file.name,
          url: fileUrl,
          key: fileKey,
        });
      }

      setFiles([]);
    } catch (e) {
      showErrorToast(e);
      resetMedia();
    }

    setIsUploadingFile(false);
  }

  function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files || []);
    setFiles((prev) => [...prev, ...selected]);
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <RichTextEditor.Control
          aria-label="Upload Photo"
          title="Upload Photo"
          disabled={isUploadingFile || media.length > 0}
        >
          <IconPhoto size={16} />
        </RichTextEditor.Control>
      </PopoverTrigger>

      <PopoverContent className="w-64 flex flex-col gap-3">
        <Button variant="outline" size="sm" asChild>
          <label className="cursor-pointer">
            <div className="flex items-center justify-center gap-1">
              <IconPhoto size={16} />
              Select Images
            </div>
            <input
              type="file"
              multiple
              accept="image/png,image/jpeg"
              className="hidden"
              onChange={handleSelect}
            />
          </label>
        </Button>

        {/* Selected file names */}
        {files.length > 0 && (
          <div className="flex flex-col gap-1">
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between text-sm border rounded px-2 py-1"
              >
                <span className="truncate">{file.name}</span>

                <button onClick={() => removeFile(index)}>
                  <IconX size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

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

export default InsertInboxImage;
