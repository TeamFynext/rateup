"use client";

import { useCallback, useEffect, useState } from "react";

import {
  FileInput,
  Group,
  NumberInput,
  Popover,
  Select,
  TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { RichTextEditor, useRichTextEditorContext } from "@mantine/tiptap";
import { IconPhoto } from "@tabler/icons-react";
import { useExtracted } from "next-intl";

import { RateupButtonPrimary } from "@/components/Button/RateupButtons";
import { uploadFile } from "@/components/Linktree/LinktreeEditor/ThemeEditor/components/SaveChangesBtn/uploadFile";

import styles from "./InsertImage.module.css";

function InsertImage() {
  const { editor } = useRichTextEditorContext();
  const translations = useExtracted();
  const [isPopoveOpen, setIsPopoverOpen] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);

  const form = useForm({
    initialValues: {
      chooseImageDDState: "Enter Image Url",
      imageUrlTextInput: "",
      uploadImageFileInputValue: null,
      imgWidth: 300,
      imgHeight: 300,
    },
    validate: {
      imageUrlTextInput: (value, values) => {
        const chooseImageDDState = values.chooseImageDDState;
        if (chooseImageDDState === translations("Enter Image Url")) {
          try {
            new URL(value);
          } catch (err) {
            return translations("Please enter a valid URL");
          }
        } else {
          return null;
        }
      },
      uploadImageFileInputValue: (value, values) => {
        const chooseImageDDState = values.chooseImageDDState;
        if (chooseImageDDState === "Upload Image") {
          if (!value) return translations("Please Choose an image to upload");
        } else {
          return null;
        }
      },
      imgWidth: (value) => {
        if (!value) {
          return translations("Please enter image width");
        } else {
          return null;
        }
      },
      imgHeight: (value) => {
        if (!value) {
          return translations("Please enter image height");
        } else {
          return null;
        }
      },
    },
  });

  const chooseImageDDState = form.getValues().chooseImageDDState;

  const handlePopoverDDFormSubmit = useCallback(
    async (values) => {
      const {
        chooseImageDDState,
        imgWidth,
        imgHeight,
        imageUrlTextInput,
        uploadImageFileInputValue,
      } = values;
      if (chooseImageDDState === "Enter Image Url") {
        if (editor) {
          editor
            .chain()
            .focus()
            .setImage({
              src: imageUrlTextInput,
              style: `width: ${imgWidth}px; height: ${imgHeight}px; max-width: 100%; object-fit:contain`,
            })
            .run();
          setIsPopoverOpen(false);
        }
      } else if (chooseImageDDState === "Upload Image") {
        setIsUploadingFile(true);
        const { url } = await uploadFile("src", uploadImageFileInputValue);
        if (editor) {
          editor
            .chain()
            .focus()
            .setImage({
              src: url,
              style: `
  width: ${imgWidth}px;
  height: ${imgHeight}px;
  object-fit: contain;
  max-width: 100%;
`,
            })
            .run();
          setIsUploadingFile(false);
          setIsPopoverOpen(false);
        }
      }
    },
    [editor],
  );

  useEffect(() => {
    if (chooseImageDDState === "Enter Image Url") {
      form.setFieldValue("uploadImageFileInputValue", null);
    } else {
      form.setFieldValue("imageUrlTextInput", "");
    }
  }, [chooseImageDDState]);

  return (
    <Popover
      position="bottom"
      withArrow
      shadow="md"
      trapFocus
      onClose={() => {
        form.reset();
        setIsPopoverOpen(false);
      }}
      opened={isPopoveOpen}
      closeOnClickOutside
    >
      <Popover.Target>
        <RichTextEditor.Control
          aria-label="Insert image"
          title={translations("Insert image")}
          onClick={() => {
            if (!isUploadingFile) {
              setIsPopoverOpen(!isPopoveOpen);
            }
          }}
        >
          <IconPhoto size={16} />
        </RichTextEditor.Control>
      </Popover.Target>
      <Popover.Dropdown
        className={styles["image-selector-popover-dropdown-div"]}
      >
        <form
          className={styles["popover-dropdown-form"]}
          onSubmit={form.onSubmit(handlePopoverDDFormSubmit)}
          onReset={form.onReset}
        >
          <Select
            label={translations("Choose Image:")}
            data={["Enter Image Url", "Upload Image"]}
            comboboxProps={{
              withinPortal: false,
            }}
            allowDeselect={false}
            withAsterisk
            {...form.getInputProps("chooseImageDDState")}
          />

          {form.getValues().chooseImageDDState === "Enter Image Url" ? (
            <TextInput
              className={styles["image-url-text-input"]}
              label={translations("Enter Image Url")}
              placeholder={translations("Enter the url of image")}
              withAsterisk
              {...form.getInputProps("imageUrlTextInput")}
            />
          ) : (
            <FileInput
              label={translations("Upload Image")}
              placeholder={translations("Choose Image to Upload")}
              withAsterisk
              {...form.getInputProps("uploadImageFileInputValue")}
            />
          )}

          <Group
            className={styles["width-height-inputs-container"]}
            wrap="nowrap"
            align="flex-start"
          >
            <NumberInput
              label={translations("Width")}
              placeholder={translations("width")}
              min={300}
              withAsterisk
              {...form.getInputProps("imgWidth")}
            />

            <NumberInput
              label={translations("Height")}
              placeholder={translations("height")}
              min={300}
              withAsterisk
              {...form.getInputProps("imgHeight")}
            />
          </Group>

          <RateupButtonPrimary
            loading={isUploadingFile}
            title={translations("submit")}
            type="submit"
          />
        </form>
      </Popover.Dropdown>
    </Popover>
  );
}

export default InsertImage;
