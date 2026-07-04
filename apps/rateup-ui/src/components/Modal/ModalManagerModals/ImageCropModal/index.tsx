import { Box, Button, Group, LoadingOverlay, NumberInput } from "@mantine/core";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { useCropperJS } from "@/hooks/useCropperJS.ts";
import { mimeTypesForImage } from "@/utils/constants.ts";

import styles from "./ImageCropModal.module.css";

function ImageCropModal({ context, id: thisModalId, innerProps }) {
  const { imageUrl, imageName, onSaveClick, onCancelClick, aspectRatio } = innerProps;

  const [scale, setScale] = useState(0.4);

  const { t: translations } = useTranslation();

  const fileExtension = imageName?.split(".")?.pop()?.toLowerCase() ?? "jpg";
  const isUnsplashImage = !imageUrl.startsWith("blob:");

  const {
    canvasRef,
    imageRef,
    selectionRef,
    isReady,
    getBounds,
    getImageDimensions,
    getCroppedCanvas,
    scaleImage,
  } = useCropperJS();

  useEffect(() => {
    if (isReady) {
      scaleImage(scale);
    }
  }, [scale, isReady, scaleImage]);

  const generateCroppedLinkForUnsplash = () => {
    const bounds = getBounds();
    const dimensions = getImageDimensions();

    if (!bounds || !dimensions) return imageUrl;

    const { x, y, width, height } = bounds;
    const { naturalWidth, naturalHeight } = dimensions;

    const focalPointX = (x + width / 2) / naturalWidth;
    const focalPointY = (y + height / 2) / naturalHeight;

    const [urlStringWithoutQueryParams, queryParamsString] = imageUrl.split("?");

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
    if (onCancelClick) onCancelClick();
    context.closeModal(thisModalId);
  }, [thisModalId, onCancelClick, context]);

  const handleSaveBtnClick = useCallback(() => {
    if (isUnsplashImage) {
      const generatedUrl = generateCroppedLinkForUnsplash();

      onSaveClick?.({
        url: generatedUrl,
        source: "unsplash",
        file: null,
      });

      context.closeModal(thisModalId);
    } else {
      getCroppedCanvas().then((croppedCanvas) => {
        croppedCanvas?.toBlob((blob) => {
          if (!blob) return;

          const file = new File([blob], imageName, {
            type: mimeTypesForImage[fileExtension],
          });

          onSaveClick?.({
            url: URL.createObjectURL(blob),
            source: "user-device",
            file,
          });

          setTimeout(() => URL.revokeObjectURL(imageUrl), 100);

          context.closeModal(thisModalId);
        }, mimeTypesForImage[fileExtension]);
      });
    }
  }, [
    imageName,
    fileExtension,
    imageUrl,
    isUnsplashImage,
    onSaveClick,
    getCroppedCanvas,
    context,
    thisModalId,
  ]);

  return (
    <>
      <NumberInput
        label={translations("Zoom the Image")}
        step={0.1}
        min={0.1}
        max={1}
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

        <cropper-canvas ref={canvasRef} style={{ height: "100%", width: "100%" }} background>
          <cropper-image ref={imageRef} src={imageUrl} alt="crop" rotatable scalable translatable />
          <cropper-selection
            ref={selectionRef}
            initial-aspect-ratio={aspectRatio}
            aspect-ratio={aspectRatio}
            initial-coverage={0.8}
            movable
            resizable
            zoomable
            keyboard
          >
            <cropper-grid role="grid" covered />
            <cropper-crosshair centered />
            <cropper-handle action="move" theme-color="rgba(255, 255, 255, 0.35)" />
            <cropper-handle action="n-resize" />
            <cropper-handle action="e-resize" />
            <cropper-handle action="s-resize" />
            <cropper-handle action="w-resize" />
            <cropper-handle action="ne-resize" />
            <cropper-handle action="nw-resize" />
            <cropper-handle action="se-resize" />
            <cropper-handle action="sw-resize" />
          </cropper-selection>
        </cropper-canvas>
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
