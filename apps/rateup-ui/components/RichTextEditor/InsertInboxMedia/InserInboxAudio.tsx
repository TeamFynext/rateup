import React, { useState } from "react";

import { FileInput, Flex, Popover, Stack } from "@mantine/core";
import { RichTextEditor } from "@mantine/tiptap";
import { IconMusic, IconUpload } from "@tabler/icons-react";

import { RateupButtonPrimary } from "@/components/Button/RateupButtons";
import { useMediaStore } from "@/components/whatsapp/inbox/chatdisplay/chatdisplayFooter";
import { uploadFile } from "@/utils/file-upload/upload";
import { showErrorToast } from "@/utils/notifications";

const InsertInboxAudio = () => {
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [file, setFile] = useState(null);
  const { addMedia, media, resetMedia } = useMediaStore();

  async function onSubmit() {
    if (!file) return;
    setIsUploadingFile(true);
    try {
      const fileKey = await uploadFile(file);
      const fileUrl = `${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${fileKey}`;

      addMedia({ type: "audio", name: file.name, url: fileUrl, key: fileKey });
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
          aria-label="Upload audio"
          title={"Upload Audio"}
          disabled={isUploadingFile || media.length > 0}
        >
          <IconMusic size={16} />
        </RichTextEditor.Control>
      </Popover.Target>
      <Popover.Dropdown>
        <Flex wrap={"wrap-reverse"} gap={"xs"}>
          <FileInput
            label={"Upload Audio"}
            placeholder={"Choose a audio to upload"}
            withAsterisk
            onChange={setFile}
            accept="audio/aac,audio/amr,audio/mpeg,audio/mp4,audio/ogg"
          />
          <RateupButtonPrimary
            loading={isUploadingFile}
            title={"Upload"}
            rightIcon={<IconUpload size={"1rem"} />}
            onClick={onSubmit}
          />
        </Flex>
      </Popover.Dropdown>
    </Popover>
  );
};

export default InsertInboxAudio;
