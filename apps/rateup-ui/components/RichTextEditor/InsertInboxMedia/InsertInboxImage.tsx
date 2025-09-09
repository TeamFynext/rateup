"use client";

import React, { useState } from "react";

import { FileInput, Flex, Popover } from "@mantine/core";
import { RichTextEditor, useRichTextEditorContext } from "@mantine/tiptap";
import { IconPhoto, IconUpload } from "@tabler/icons-react";

import { RateupButtonPrimary } from "@/components/Button/RateupButtons";
import { useMediaStore } from "@/components/whatsapp/inbox/chatdisplay/chatdisplayFooter";
import { uploadFile } from "@/utils/file-upload/upload";
import { showErrorToast } from "@/utils/notifications";

const InsertInboxImage = () => {
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [file, setFile] = useState(null);
  const { addMedia, media, resetMedia } = useMediaStore();

  async function onSubmit() {
    if (!file) return;
    setIsUploadingFile(true);
    try {
      const fileKey = await uploadFile(file);
      const fileUrl = `${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${fileKey}`;

      addMedia({ type: "image", name: file.name, url: fileUrl, key: fileKey });
      setIsUploadingFile(false);
    } catch (e) {
      setIsUploadingFile(false);
      showErrorToast(e);
      resetMedia();
    }
  }

  return (
    <Popover position="top" withArrow shadow="md" trapFocus closeOnClickOutside>
      <Popover.Target>
        <RichTextEditor.Control
          aria-label="Upload Photo"
          title={"Upload Photo"}
          disabled={isUploadingFile || media.length > 0}
        >
          <IconPhoto size={16} />
        </RichTextEditor.Control>
      </Popover.Target>
      <Popover.Dropdown>
        <Flex wrap={"wrap-reverse"} gap={"xs"}>
          <FileInput
            label={"Upload Photo"}
            placeholder={"Choose a photo to upload"}
            withAsterisk
            onChange={setFile}
            accept="image/png,image/jpeg"
          />
          <RateupButtonPrimary
            loading={isUploadingFile}
            title={"Upload"}
            onClick={onSubmit}
            rightIcon={<IconUpload size={"1rem"} />}
            size="sm"
          />
        </Flex>
      </Popover.Dropdown>
    </Popover>
  );
};

export default InsertInboxImage;
