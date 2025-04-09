import React, { useState } from "react";

import {
  FileInput,
  Group,
  NumberInput,
  Popover,
  Select,
  Stack,
  TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { RichTextEditor, useRichTextEditorContext } from "@mantine/tiptap";
import {
  IconFile,
  IconImageInPicture,
  IconPhoto,
  IconVideo,
} from "@tabler/icons-react";

import { RateupButtonPrimary } from "@/components/Button/RateupButtons";
import { useMediaStore } from "@/components/whatsapp/inbox/chatdisplay/chatdisplayFooter";
import { uploadFile } from "@/utils/file-upload/upload";
import { showErrorToast } from "@/utils/notifications";

const InsertInboxVideo = () => {
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [file, setFile] = useState(null);
  const { addMedia, media } = useMediaStore();

  async function onSubmit() {
    if (!file) return;
    setIsUploadingFile(true);
    try {
      console.log("file", file);
      const fileKey = await uploadFile(file);
      const fileUrl = `${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${fileKey}`;
      // const fileUrl = `http://d2uj946b0i8y27.cloudfront.net/1744174820095-yes-or-no-2.mp4`
      console.log("fileUrl", fileUrl);

      addMedia({ type: "video", name: file.name, url: fileUrl, key: fileKey });
      setIsUploadingFile(false);
    } catch (e) {
      setIsUploadingFile(false);
      showErrorToast(e);
    }
  }

  return (
    <Popover position="top" withArrow shadow="md" trapFocus closeOnClickOutside>
      <Popover.Target>
        <RichTextEditor.Control
          aria-label="Upload Image"
          title={"Upload Image"}
          disabled={isUploadingFile || media.length > 0}
        >
          <IconVideo size={16} />
        </RichTextEditor.Control>
      </Popover.Target>
      <Popover.Dropdown>
        <form onSubmit={onSubmit}>
          <Stack>
            <FileInput
              label={"Upload Video"}
              placeholder={"Choose a video to upload"}
              withAsterisk
              onChange={setFile}
              accept="video/3gpp,video/mp4"
            />
            <RateupButtonPrimary
              loading={isUploadingFile}
              title={"Submit"}
              type="submit"
            />
          </Stack>
        </form>
      </Popover.Dropdown>
    </Popover>
  );
};

export default InsertInboxVideo;
