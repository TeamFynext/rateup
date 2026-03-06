"use client";

import { useCallback, useRef, useState } from "react";

import { Box, Button, Group, LoadingOverlay, NumberInput } from "@mantine/core";
import { modals } from "@mantine/modals";
import { useTranslations } from "next-intl";
import Cropper, { ReactCropperElement } from "react-cropper";

import { mimeTypesForImage } from "../../../../utils/constants";
import styles from "./ImageCropModal.module.css";

function ImageCropModal({ context, id: thisModalId, innerProps }) {
  const { imageUrl, imageName, onSaveClick, onCancelClick, aspectRatio } =
    innerProps;

  const cropperRef = useRef<ReactCropperElement>(undefined);
  const [scale, setScale] = useState(0.4);
  const [isCropperReady, setIsCropperReady] = useState(false);
  const translations = useTranslations();
  const fileExtension = imageName?.split(".")?.pop()?.toLowerCase() ?? "jpg";
  const isUnsplashImage = !imageUrl.startsWith("blob:");

  const generateCroppedLinkForUnsplash = () => {
    const { x, y, width, height } = cropperRef.current?.cropper.getData();
    const { naturalWidth, naturalHeight } =
      cropperRef.current?.cropper.getImageData();
    const focalPointX = (x + width / 2) / naturalWidth;
    const focalPointY = (y + height / 2) / naturalHeight;

    const [urlStringWithoutQueryParams, queryParamsString] =
      imageUrl.split("?");
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
    if (onCancelClick) onCancelClick();
    context.closeModal(thisModalId);
  }, [thisModalId, onCancelClick]);

  const handleSaveBtnClick = useCallback(() => {
    if (isUnsplashImage) {
      const generatedUrl = generateCroppedLinkForUnsplash();
      onSaveClick({
        url: generatedUrl,
        source: "unsplash",
        file: null,
      });
      modals.closeAll();
    } else {
      const croppedCanvas = cropperRef.current?.cropper.getCroppedCanvas();
      croppedCanvas?.toBlob((blob) => {
        if (!blob) return;
        if (onSaveClick) {
          const file = new File([blob], imageName, {
            type: mimeTypesForImage[fileExtension],
          });
          onSaveClick({
            url: URL.createObjectURL(blob),
            source: "user-device",
            file,
          });
          setTimeout(() => URL.revokeObjectURL(imageUrl), 100);
          modals.closeAll();
        }
      }, mimeTypesForImage[fileExtension]);
    }
  }, []);

  return (
    <>
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
          initialAspectRatio={aspectRatio}
          aspectRatio={aspectRatio}
          preview=".img-preview"
          src={imageUrl}
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
    </>
  );
}

export default ImageCropModal;
