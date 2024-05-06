import { useContext, useEffect, useRef, useState } from "react";
import { CurrentResponsesContext } from "../../../../../context/ResponseContext";
import {
  ActionIcon,
  Box,
  Button,
  FileButton,
  Group,
  Image,
  Loader,
  LoadingOverlay,
  Stack,
  Text,
} from "@mantine/core";
import { uploadFile } from "../../../../../utils/file-upload/upload";
import { IconX } from "@tabler/icons-react";
import { getFileName } from "../../../SurveyTheme/components/BackgroundStyles";
import { modals } from "@mantine/modals";
import imageCropModalStyles from "../../../../Modal/ModalManagerModals/ImageCropModal/ImageCropModal.module.css";
import styles from "./ImageForm.module.css";
import { useSurveyThemeData } from "../../../../../context/SurveyThemeContext";

export function ImageForm({ isPreview }: { isPreview?: boolean }) {
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    isPreview ? null : response || null,
  );
  const [isHeic2anyConverting, setIsHeic2anyConverting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const resetRef = useRef<() => void>(null);
  const surveyThemeObj = useSurveyThemeData();
  const surveyThemeBtnStyles = surveyThemeObj?.surveyTheme?.button?.styles;

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
    const fileExtension = file.name?.split(".")?.pop()?.toLowerCase() ?? "jpg";

    let selectedImageUrl: string;
    let selectedImageName: string;

    if (fileExtension === "heic") {
      try {
        const heic2any = (await import("heic2any")).default;
        setIsHeic2anyConverting(true);
        const convertedFile = (await heic2any({
          blob: file,
          toType: "image/jpeg",
        })) as Blob;
        setIsHeic2anyConverting(false);
        selectedImageUrl = URL.createObjectURL(convertedFile);
        selectedImageName = file.name.toLowerCase().replace("heic", "jpeg");
        console.log("this is the converted file", convertedFile);
      } catch (err) {
        console.log(err, "unbale to convert heic image to jpeg");
      }
    } else {
      selectedImageUrl = URL.createObjectURL(file);
      selectedImageName = file.name;
    }

    if (selectedImageUrl && selectedImageName) {
      modals.openContextModal({
        modal: "imageCropModal",
        title: "Crop Image",
        centered: true,
        classNames: {
          content: imageCropModalStyles["modal-content"],
          header: imageCropModalStyles["modal-header"],
          body: imageCropModalStyles["modal-body"],
        },
        innerProps: {
          imageUrl: selectedImageUrl,
          imageName: selectedImageName,
          onSaveClick: handleCropImageSave,
          aspectRatio: 4 / 3,
        },
      });
    }
    resetRef?.current?.();
  };

  const handleCropImageSave = async ({ file }) => {
    console.log("recieved file in handle crop image save", file);
    if (!file) return;
    setFile(file);
  };

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
              Upload image
            </Button>
          )}
        </FileButton>

        {isHeic2anyConverting && (
          <Stack gap={0} className={styles["converting-loader-p-container"]}>
            <p
              className={styles["converting-text-p"]}
              style={{
                color: surveyThemeBtnStyles?.backgroundColor || "initial",
              }}
            >
              Converting heic image to jpeg
            </p>
            <Loader type="dots" color={surveyThemeBtnStyles?.backgroundColor} />
          </Stack>
        )}
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
