import React, { useState } from "react";

import { FileInput, Flex, Popover, Stack } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { RichTextEditor } from "@mantine/tiptap";
import { IconFile, IconUpload } from "@tabler/icons-react";

import { RateupButtonPrimary } from "@/components/Button/RateupButtons";
import { useMediaStore } from "@/components/whatsapp/inbox/chatdisplay/chatdisplayFooter";
import { uploadFile } from "@/utils/file-upload/upload";
import { showErrorToast } from "@/utils/notifications";

const InsertInboxFile = () => {
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [file, setFile] = useState(null);
  const { addMedia, media, resetMedia } = useMediaStore();

  async function onSubmit() {
    if (!file) return;
    setIsUploadingFile(true);
    try {
      const fileKey = await uploadFile(file);
      const fileUrl = `${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${fileKey}`;
      addMedia({
        type: "document",
        name: file.name,
        url: fileUrl,
        key: fileKey,
      });
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
          aria-label="Insert File"
          title={"Insert File"}
          disabled={isUploadingFile || media.length > 0}
        >
          <IconFile size={16} />
        </RichTextEditor.Control>
      </Popover.Target>
      <Popover.Dropdown>
        <Flex wrap={"wrap-reverse"} gap={"xs"}>
          <FileInput
            label={"Upload File"}
            placeholder={"Choose a file to upload"}
            withAsterisk
            onChange={setFile}
            accept="text/plain,application/vnd.ms-excel,.docx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/pdf"
          />
          <RateupButtonPrimary
            loading={isUploadingFile}
            title={"Upload"}
            onClick={onSubmit}
            rightIcon={<IconUpload size={"1rem"} />}
          />
        </Flex>
      </Popover.Dropdown>
    </Popover>
  );
};

export default InsertInboxFile;
