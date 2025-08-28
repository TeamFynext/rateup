"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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
import { useTranslations } from "next-intl";

import { RateupButtonPrimary } from "@/components/Button/RateupButtons";
import { uploadFile } from "@/components/Linktree/LinktreeEditor/ThemeEditor/components/SaveChangesBtn/uploadFile";

import styles from "./InsertImage.module.css";

function InsertBase64Image() {
  const { editor } = useRichTextEditorContext();
  const translations = useTranslations();
  const [isPopoveOpen, setIsPopoverOpen] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [base64Image, setBase64Image] = useState<string | null>(null);

  const form = useForm({
    initialValues: {
      chooseImageDDState: "Enter Image Url",
      imageUrlTextInput: "",
      uploadImageFileInputValue: null,
      imgWidth: 300,
      imgHeight: 300,
    },
  });

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
              style: `width: ${imgWidth}px; height: ${imgHeight}px; max-width: 100%; object-fit:contain`,
            })
            .run();
          setIsUploadingFile(false);
          setIsPopoverOpen(false);
        }
      }
    },
    [editor],
  );

  const handleFileChange = async (file: File) => {
    const base64String = await FileConverter.fileToBase64(file);
    setBase64Image(base64String);
  };

  const handleSubmit = async (values) => {
    setIsUploadingFile(true);
    try {
      editor
        .chain()
        .focus()
        .setImage({
          src: base64Image,
        })
        .run();
      setIsPopoverOpen(false);
    } catch (error) {
      console.error("Error uploading file:", error);
    } finally {
      setIsUploadingFile(false);
    }
  };

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
          onSubmit={form.onSubmit(handleSubmit)}
          onReset={form.onReset}
        >
          <FileInput
            label="Upload Image"
            placeholder="Choose an image file"
            onChange={handleFileChange}
          />

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

export default InsertBase64Image;

class FileConverter {
  public static async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        let base64URL = reader.result as string;
        resolve(base64URL);
      };

      reader.onerror = (error) => {
        reject(error);
      };

      reader.readAsDataURL(file); // Converts the file to base64 URL
    });
  }
}
