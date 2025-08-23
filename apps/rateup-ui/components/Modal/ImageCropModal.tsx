import {
  Box,
  Button,
  Group,
  LoadingOverlay,
  Modal,
  NumberInput,
} from "@mantine/core";

import "cropperjs/dist/cropper.css";

import { useCallback, useRef, useState } from "react";

import { useTranslations } from "next-intl";
import Cropper, { ReactCropperElement } from "react-cropper";

import { mimeTypesForImage } from "../../utils/constants";
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
  const cropperRef = useRef<ReactCropperElement>(undefined);
  const [scale, setScale] = useState(0.4);
  const [isCropperReady, setIsCropperReady] = useState(false);
  const translations = useTranslations();
  const fileExtension = imageName?.split(".")?.pop()?.toLowerCase() ?? "jpg";
  const isUnsplashImage = !image?.startsWith("blob:");

  const generateCroppedLinkForUnsplash = () => {
    const { x, y, width, height } = cropperRef.current?.cropper.getData();
    const { naturalWidth, naturalHeight } =
      cropperRef.current?.cropper.getImageData();
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
    // queryParams.set("fp-debug", "true");

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
      const croppedCanvas = cropperRef.current?.cropper.getCroppedCanvas();
      croppedCanvas?.toBlob((blob) => {
        if (!blob) return;
        const file = new File([blob], imageName, {
          type: mimeTypesForImage[fileExtension],
        });
        if (handleCropImageSave) {
          handleCropImageSave(file);
          setTimeout(() => URL.revokeObjectURL(image), 100);
          onclose();
        }
      }, mimeTypesForImage[fileExtension]);
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
          visible={!isCropperReady}
          zIndex={1000}
          overlayProps={{ radius: "sm", blur: 2 }}
          loaderProps={{ type: "bars" }}
        />

        <Cropper
          ref={cropperRef}
          style={{ height: "100%", width: "100%" }}
          initialAspectRatio={aspect}
          {...(!freeMode && { aspectRatio: aspect })}
          preview=".img-preview"
          src={image}
          viewMode={0}
          zoomable
          zoomTo={scale}
          minCropBoxHeight={100}
          minCropBoxWidth={100}
          background={false}
          responsive={true}
          autoCropArea={1}
          checkOrientation={false}
          guides={true}
          highlight
          ready={(e) => setIsCropperReady(true)}
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
