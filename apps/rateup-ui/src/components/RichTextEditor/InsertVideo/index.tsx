"use client";

import { useRef } from "react";

import {
  Group,
  NumberInput,
  Popover,
  Stack,
  Switch,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { RichTextEditor, useRichTextEditorContext } from "@mantine/tiptap";
import { IconVideo } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { RateupButtonPrimary } from "@/components/Button/RateupButtons.tsx";

import { isYouTubeLink } from "../utils.ts";

function InsertVideo() {
  const { editor } = useRichTextEditorContext();
  const form = useForm({
    initialValues: {
      src: "",
      height: 0,
      width: 0,
      customSize: false,
    },
  });
  const ref = useRef(null);
  const { t: translations } = useTranslation();
  const handleImageVideo = () => {
    try {
      const url = form.getValues().src;
      new URL(url);
      const videoOption = form.getValues().customSize
        ? {
            src: url,
            width: form.getValues().width,
            height: form.getValues().height,
          }
        : { src: form.getValues().src };
      if (isYouTubeLink(url)) {
        editor.commands.setYoutubeVideo(videoOption);
      } else {
        editor.commands.setVideo(videoOption);
      }
      ref?.current?.click();
      form.reset();
    } catch (error) {
      form.setErrors({ src: "Enter a valid url" });
    }
  };
  return (
    <Popover position="bottom" withArrow shadow="md">
      <Popover.Target>
        <RichTextEditor.Control
          aria-label="Insert video"
          title={translations("Insert video")}
          ref={ref}
        >
          <IconVideo size={16} />
        </RichTextEditor.Control>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack justify="center">
          <Group>
            <Tooltip
              label={translations("Enable Custom size")}
              refProp="rootRef"
            >
              <Switch {...form.getInputProps("customSize")} mt={"lg"} />
            </Tooltip>
            <NumberInput
              label={translations("height")}
              w={100}
              disabled={!form.getValues().customSize}
              min={0}
              {...form.getInputProps("height")}
            />
            <NumberInput
              label={translations("width")}
              w={100}
              min={0}
              disabled={!form.getValues().customSize}
              {...form.getInputProps("width")}
            />
          </Group>

          <TextInput
            type="url"
            placeholder={translations("Enter the url of video")}
            {...form.getInputProps("src")}
          />
          <RateupButtonPrimary
            title={translations("submit")}
            onClick={handleImageVideo}
          />
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}

export default InsertVideo;
