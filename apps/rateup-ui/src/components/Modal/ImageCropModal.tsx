"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  Box,
  Button,
  Group,
  LoadingOverlay,
  Modal,
  NumberInput,
} from "@mantine/core";
import { useTranslation } from "react-i18next";

import { Cropper, type CropperRef } from "@/components/Cropper/Cropper.tsx";
import { mimeTypesForImage } from "@/utils/constants.ts";

import styles from "./ModalManagerModals/ImageCropModal/ImageCropModal.module.css";

interface ImageCropModalProps {
  opened: boolean;
  onclose: () => void;
  image: string;
  imageName: string;
  handleCropImageSave: (file: File | string) => void;
  aspect?: number;
  freeMode?: boolean;
}

export const ImageCropModal = ({
  opened,
  onclose,
  image,
  imageName,
  handleCropImageSave,
  aspect = 4 / 3,
  freeMode = false,
}: ImageCropModalProps) => {
  const [scale, setScale] = useState(0.4);
  const { t: translations } = useTranslation();
  const fileExtension = imageName?.split(".")?.pop()?.toLowerCase() ?? "jpg";
  const isUnsplashImage = !image?.startsWith("blob:");

  const cropperRef = useRef<CropperRef>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (isReady) {
      cropperRef.current?.scaleImage(scale);
    }
  }, [scale, isReady]);

  const generateCroppedLinkForUnsplash = () => {
    const bounds = cropperRef.current?.getBounds();
    const dimensions = cropperRef.current?.getImageDimensions();

    if (!bounds || !dimensions) return image;

    const { x, y, width, height } = bounds;
    const { naturalWidth, naturalHeight } = dimensions;
    const focalPointX = (x + width / 2) / naturalWidth;
    const focalPointY = (y + height / 2) / naturalHeight;

    const [urlStringWithoutQueryParams, queryParamsString] = image.split("?");
    const queryParams = new URLSearchParams(queryParamsString);

    queryParams.set("w", `${width}`);
    queryParams.set("h", `${height}`);
    queryParams.set("fit", "crop");
    queryParams.set("crop", "focalPoint");
    queryParams.set("fp-x", `${focalPointX}`);
    queryParams.set("fp-y", `${focalPointY}`);
    queryParams.set("fp-z", "1");

    const newImageUrl = `${urlStringWithoutQueryParams}?${queryParams.toString()}`;
    return encodeURI(newImageUrl);
  };

  const handleCancelBtnClick = useCallback(() => {
    onclose();
  }, [onclose]);

  const handleSaveBtnClick = useCallback(() => {
    if (isUnsplashImage) {
      const generatedUrl = generateCroppedLinkForUnsplash();
      handleCropImageSave(generatedUrl);
      onclose();
    } else {
      cropperRef.current?.getCroppedCanvas().then((croppedCanvas) => {
        croppedCanvas?.toBlob((blob) => {
          if (!blob) return;
          const file = new File([blob], imageName, {
            type: mimeTypesForImage[fileExtension],
          });
          console.log("file", file);
          if (handleCropImageSave) {
            handleCropImageSave(file);
            setTimeout(() => URL.revokeObjectURL(image), 100);
            onclose();
          }
        }, mimeTypesForImage[fileExtension]);
      });
    }
  }, [isUnsplashImage, fileExtension, image, imageName, handleCropImageSave]);

  return (
    <Modal
      classNames={{
        content: styles["modal-content"],
        header: styles["modal-header"],
        body: styles["modal-body"],
      }}
      title={translations("Crop Image")}
      centered
      onClose={() => {
        onclose();
        setScale(0.4);
      }}
      opened={opened}
      radius={"lg"}
      zIndex={9999}
    >
      <NumberInput
        label={translations("Zoom the Image")}
        step={0.1}
        min={0.1}
        max={1}
        defaultValue={0.4}
        value={scale}
        onChange={(e) => setScale(Number(e))}
        decimalScale={1}
        fixedDecimalScale
      />
      <Box className={styles["cropper-container"]}>
        <LoadingOverlay
          visible={!isReady}
          zIndex={1000}
          overlayProps={{ radius: "sm", blur: 2 }}
          loaderProps={{ type: "bars" }}
        />

        <Cropper
          ref={cropperRef}
          src={image}
          aspectRatio={aspect}
          freeMode={freeMode}
          onReady={() => setIsReady(true)}
        />
      </Box>
      <Group className={styles["cancel-save-btn-container"]} justify="right">
        <Button className={styles["cancel-btn"]} onClick={handleCancelBtnClick}>
          {translations("Cancel")}
        </Button>
        <Button className={styles["save-btn"]} onClick={handleSaveBtnClick}>
          {translations("Save")}
        </Button>
      </Group>
    </Modal>
  );
};
