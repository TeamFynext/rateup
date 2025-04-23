import React, { useState } from "react";

import {
  FileInput,
  Flex,
  Group,
  NumberInput,
  Popover,
  Select,
  Stack,
  TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { RichTextEditor, useRichTextEditorContext } from "@mantine/tiptap";
import { IconUpload, IconVideo } from "@tabler/icons-react";

import { RateupButtonPrimary } from "@/components/Button/RateupButtons";
import { useMediaStore } from "@/components/whatsapp/inbox/chatdisplay/chatdisplayFooter";
import { uploadFile } from "@/utils/file-upload/upload";
import { showErrorToast } from "@/utils/notifications";

const InsertInboxVideo = () => {
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [file, setFile] = useState(null);
  const { addMedia, media, resetMedia } = useMediaStore();

  async function onSubmit() {
    if (!file) return;
    setIsUploadingFile(true);
    try {
      const fileKey = await uploadFile(file);
      const fileUrl = `${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${fileKey}`;

      addMedia({ type: "video", name: file.name, url: fileUrl, key: fileKey });
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
          aria-label="Upload Video"
          title={"Upload Video"}
          disabled={isUploadingFile || media.length > 0}
        >
          <IconVideo size={16} />
        </RichTextEditor.Control>
      </Popover.Target>
      <Popover.Dropdown>
        <Flex wrap={"wrap-reverse"} gap={"xs"}>
          <FileInput
            label={"Upload Video"}
            placeholder={"Choose a video to upload"}
            withAsterisk
            onChange={setFile}
            accept="video/3gpp,video/mp4"
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

export default InsertInboxVideo;
