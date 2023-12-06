import { useContext, useEffect, useRef, useState } from "react";
import { CurrentResponsesContext } from "../../../../../context/ResponseContext";
import {
  ActionIcon,
  Box,
  Button,
  Center,
  FileButton,
  Group,
  Image,
  Stack,
  Text,
} from "@mantine/core";
import { uploadFile } from "../../../../../utils/file-upload/upload";
import { IconX } from "@tabler/icons-react";
import { getFileName } from "../../../SurveyTheme/components/BackgroundStyles";

export function ImageForm({ isPreview }: { isPreview?: boolean }) {
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    isPreview ? null : response || null,
  );
  const resetRef = useRef<() => void>(null);

  useEffect(() => {
    const uploadAndUpdate = async () => {
      if (file) {
        const fileKey = await uploadFile(file);
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

  return (
    <Stack>
      <Box w={300}>
        <FileButton
          resetRef={resetRef}
          onChange={setFile}
          accept="image/png,image/jpeg,image/svg+xml,image/webp"
        >
          {(props) => (
            <Button
              fullWidth
              size="lg"
              radius="lg"
              variant="outline"
              {...props}
            >
              Upload image
            </Button>
          )}
        </FileButton>
      </Box>

      <Stack mt="lg">
        {(file || response?.length > 0) && (
          <Group justify="flex-end">
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

        <Center>
          {(previewUrl || response?.length > 0) && (
            <Image
              src={
                previewUrl ||
                `${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${response}`
              }
              alt="Preview"
              style={{ maxWidth: "100px", height: "auto", maxHeight: "100px" }}
            />
          )}
        </Center>

        {(file || response?.length > 0) && (
          <Text size="sm" style={{ textAlign: "center" }} mt="sm">
            Picked file:{" "}
            {file?.name || getFileName(response, isPreview || false)}
          </Text>
        )}
      </Stack>
    </Stack>
  );
}
