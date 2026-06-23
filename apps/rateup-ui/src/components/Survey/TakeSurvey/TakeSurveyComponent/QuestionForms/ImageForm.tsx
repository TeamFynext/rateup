"use client";

import type { ReactNode } from "react";
import { useContext, useEffect, useRef, useState } from "react";

import {
  ActionIcon,
  Box,
  Button,
  FileButton,
  Group,
  Image,
  LoadingOverlay,
  Stack,
  Text,
} from "@mantine/core";
import { IconX } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { CurrentResponsesContext } from "@/context/ResponseContext.ts";
import { useSurveyThemeData } from "@/context/SurveyThemeContext.tsx";
import { uploadFile } from "@/utils/file-upload/upload.ts";

import styles from "./ImageForm.module.css";

function getFileName(url: string | File, isNewFile: boolean): ReactNode {
  if (isNewFile || typeof url === "string") return <>{url}</>;
  const pattern = /^[^-]+-/;
  return url.name.replace(pattern, "");
}

export function ImageForm({ isPreview }: { isPreview?: boolean }) {
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    isPreview ? null : response || null,
  );
  const [isUploading, setIsUploading] = useState(false);

  const resetRef = useRef<() => void>(null);

  const surveyThemeObj = useSurveyThemeData();
  const pickedFileTextColor = surveyThemeObj?.surveyTheme?.title?.styles?.color;

  useEffect(() => {
    const uploadAndUpdate = async () => {
      if (file) {
        setIsUploading(true);
        const fileKey = await uploadFile(file);
        setIsUploading(false);
        updateResponse(fileKey);
      }
    };
    uploadAndUpdate();
  }, [file]);

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);

      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [file]);

  function removeImg() {
    setFile(null);
    resetRef.current?.();
    setPreviewUrl(null);
    updateResponse(null);
  }

  const onChangePicture = async (file: File) => {
    if (!file) return;
    setFile(file);
  };
  const { t: translations } = useTranslation();
  const isImageSelected = previewUrl || response?.length > 0;
  const imageContainerWidthAndHeight = isImageSelected ? 150 : 0;

  return (
    <Stack className={styles["image-form-root-div"]}>
      <Stack className={styles["file-btn-and-converting-loader-container"]}>
        <FileButton
          resetRef={resetRef}
          onChange={onChangePicture}
          accept="image/png,image/jpeg,image/svg+xml,image/webp,.heic"
        >
          {(props) => (
            <Button
              className={styles["upload-btn"]}
              fullWidth
              size="lg"
              radius="lg"
              variant="outline"
              {...props}
            >
              {translations("Upload image")}
            </Button>
          )}
        </FileButton>
      </Stack>
      <Box
        className={styles["image-remove-icon-picked-file-text-container"]}
        style={{ position: "relative" }}
      >
        <Stack align="center">
          {(file || response?.length > 0) && (
            <Group
              justify="flex-end"
              style={{ position: "absolute", right: 0, top: 0 }}
            >
              <ActionIcon
                onClick={removeImg}
                variant="filled"
                color="gray"
                radius="lg"
              >
                <IconX style={{ width: "70%", height: "70%" }} stroke={1.5} />
              </ActionIcon>
            </Group>
          )}

          <Box
            className="image-container"
            style={{
              position: "relative",
              width: imageContainerWidthAndHeight,
              height: imageContainerWidthAndHeight,
            }}
          >
            <LoadingOverlay
              visible={isUploading}
              zIndex={1000}
              overlayProps={{ radius: "sm", blur: 2 }}
            />
            {isImageSelected && (
              <Image
                fit="contain"
                src={
                  previewUrl ||
                  `${import.meta.env.VITE_AWS_CLOUDFRONT_URL}${response}`
                }
                alt="Preview"
                style={{ width: "100%", height: "100%" }}
              />
            )}
          </Box>

          {isImageSelected && (
            <Text
              size="sm"
              style={{ textAlign: "center" }}
              c={pickedFileTextColor}
            >
              {translations("Picked file:")}
              {file?.name || getFileName(response, isPreview || false)}
            </Text>
          )}
        </Stack>
      </Box>
    </Stack>
  );
}
