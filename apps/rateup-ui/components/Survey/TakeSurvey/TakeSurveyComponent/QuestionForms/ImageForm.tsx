import { useContext, useEffect, useRef, useState } from "react";
import { CurrentResponsesContext } from "../../../../../context/ResponseContext";
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
import { uploadFile } from "../../../../../utils/file-upload/upload";
import { IconX } from "@tabler/icons-react";
import { getFileName } from "../../../SurveyTheme/components/BackgroundStyles";
import { ImageCropModal } from "../../../../Modal/ImageCropModal";
import { useDisclosure } from "@mantine/hooks";

export function ImageForm({ isPreview }: { isPreview?: boolean }) {
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    isPreview ? null : response || null,
  );

  const [isUploading, setIsUploading] = useState(false);

  const resetRef = useRef<() => void>(null);
  const [selectedImage, setSelectedImage] = useState({
    url: "",
    name: "",
  });
  const [
    openedCropDialog,
    { toggle: toggleCropDialog, close: closeCropDialog },
  ] = useDisclosure(false);

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

  const onChangePicture = (event: File) => {
    if (!event) return;
    setSelectedImage({
      url: URL.createObjectURL(event),
      name: event.name,
    });
    toggleCropDialog();
    resetRef?.current?.();
  };

  const handleCropImageSave = async (cropedImage) => {
    if (!cropedImage) return;
    setFile(cropedImage);
  };

  const isImageSelected = previewUrl || response?.length > 0;
  const imageContainerWidthAndHeight = isImageSelected ? 150 : 0;

  return (
    <Stack>
      <ImageCropModal
        opened={openedCropDialog}
        onclose={closeCropDialog}
        imageName={selectedImage.name}
        handleCropImageSave={handleCropImageSave}
        image={selectedImage.url}
        aspect={4 / 3}
      />
      <Box w={300}>
        <FileButton
          resetRef={resetRef}
          onChange={onChangePicture}
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

      <Box
        className={"image-remove-icon-picked-file-text-container"}
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
                  `${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${response}`
                }
                alt="Preview"
                style={{ width: "100%", height: "100%" }}
              />
            )}
          </Box>

          {isImageSelected && (
            <Text size="sm" style={{ textAlign: "center" }}>
              Picked file:{" "}
              {file?.name || getFileName(response, isPreview || false)}
            </Text>
          )}
        </Stack>
      </Box>
    </Stack>
  );
}
