"use client";

import { useContext, useEffect, useState } from "react";

import {
  ActionIcon,
  Group,
  Loader,
  LoadingOverlay,
  luminance,
  rem,
  Stack,
  Text,
  useMantineTheme,
} from "@mantine/core";
import { Dropzone, DropzoneProps } from "@mantine/dropzone";
import { IconFileFilled, IconUpload, IconX } from "@tabler/icons-react";
import { useExtracted } from "next-intl";

import { CurrentResponsesContext } from "../../../../../context/ResponseContext";
import {
  deleteUploadedFiles,
  getFileNameFromKey,
  uploadFile,
} from "../../../../../utils/file-upload/upload";
import PaperLayout from "../../../../styled/Layouts/PaperLayout";

interface FileInputFormProps extends Partial<DropzoneProps> {
  isPreview?: boolean;
}
const FileInputForm = ({ isPreview, ...dropzoneprops }: FileInputFormProps) => {
  const theme = useMantineTheme();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [error, setError] = useState("");
  const translations = useExtracted();
  const themePrimaryColor = theme.colors.primaryColor
    ? theme.colors.primaryColor[5]
    : "#1C518E";
  const dragFileTextColor =
    luminance(themePrimaryColor) > 0.8
      ? `var(--mantine-color-gray-7)`
      : themePrimaryColor;

  const { response, updateResponse } = useContext(CurrentResponsesContext);
  const handleUploadedFiles = async () => {
    try {
      if (!file) return;
      setError("");
      const prevResponse = response;
      if (prevResponse) updateResponse(null);
      setIsUploading(true);
      if (prevResponse?.length) {
        await deleteUploadedFiles({
          fileKeyArray: [{ Key: prevResponse }],
        });
      }
      const fileKey = await uploadFile(file, false, { allowAll: true });
      console.log(fileKey);
      updateResponse(fileKey);
      setIsUploading(false);
    } catch (e) {
      console.log(e);
      setIsUploading(false);
      updateResponse(null);
      setError("Error in uploading file");
    }
  };

  useEffect(() => {
    handleUploadedFiles();
  }, [file]);

  const handleRemoveFile = async (filekey) => {
    setIsRemoving(true);
    await deleteUploadedFiles({
      fileKeyArray: [{ Key: filekey }],
    });
    setFile(null);
    updateResponse(null);
    setIsRemoving(false);
  };

  return (
    <Stack>
      <Dropzone
        onDrop={(files) => setFile(files[0])}
        onReject={(files) => {
          setError(files[0].errors[0].message);
        }}
        maxSize={10 * 1024 ** 2}
        {...dropzoneprops}
        style={{
          borderColor: `var(--mantine-color-${theme.primaryColor}-outline)`,
          borderRadius: "8px",
        }}
        disabled={isPreview}
      >
        <Group
          justify="center"
          gap="xl"
          mih={80}
          style={{ pointerEvents: "none" }}
        >
          <Dropzone.Accept>
            <IconUpload
              stroke={1.5}
              color={`var(--mantine-color-${theme.primaryColor}-filled)`}
            />
          </Dropzone.Accept>
          <Dropzone.Reject>
            <IconX color="var(--mantine-color-red-6)" stroke={1.5} />
          </Dropzone.Reject>
          <Dropzone.Idle>
            <IconFileFilled
              color="var(--mantine-color-dimmed)"
              stroke={1.5}
              size={"2.5rem"}
            />
            <LoadingOverlay
              visible={isUploading}
              zIndex={1000}
              overlayProps={{ radius: "sm", blur: 2 }}
            />
          </Dropzone.Idle>
          <div>
            <Text size="md" inline c={dragFileTextColor}>
              {translations("Drag file here or click to select file")}
            </Text>
            <Text size="xs" c="dimmed" inline mt={7}>
              {translations("File should not exceed 10mb")}
            </Text>
          </div>
        </Group>
      </Dropzone>
      <Text c="red">{error}</Text>
      {response && !isPreview ? (
        <PaperLayout
          style={{
            border: `1px solid var(--mantine-color-${theme.primaryColor}-outline)`,
          }}
        >
          <Group justify={"space-between"}>
            <Text>{file?.name || getFileNameFromKey(response)}</Text>
            {isRemoving ? (
              <Loader size={"sm"} />
            ) : (
              <ActionIcon
                onClick={() => handleRemoveFile(response)}
                variant="filled"
                color="gray"
                radius="lg"
              >
                <IconX style={{ width: "70%", height: "70%" }} stroke={1.5} />
              </ActionIcon>
            )}
          </Group>
        </PaperLayout>
      ) : null}
    </Stack>
  );
};

export default FileInputForm;
