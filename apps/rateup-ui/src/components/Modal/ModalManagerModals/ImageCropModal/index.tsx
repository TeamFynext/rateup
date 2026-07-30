import { useId, useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button.tsx";
import { Field, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { LoadingOverlay } from "@/components/ui/loading-overlay.tsx";
import { useCropperJS } from "@/hooks/useCropperJS.ts";
import { mimeTypesForImage } from "@/utils/constants.ts";

import styles from "./ImageCropModal.module.css";

function ImageCropModal({
  context,
  id: thisModalId,
  innerProps,
}: {
  context: { closeModal: (id: string) => void };
  id: string;
  innerProps: {
    imageUrl: string;
    imageName: string;
    onSaveClick?: (result: { file?: File; url: string; source?: string }) => void;
    onCancelClick?: () => void;
    aspectRatio?: number;
  };
}) {
  const uid = useId();
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
        file: undefined,
      });

      context.closeModal(thisModalId);
    } else {
      getCroppedCanvas().then((croppedCanvas) => {
        croppedCanvas?.toBlob((blob: Blob | null) => {
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
      <Field>
        <FieldLabel htmlFor={`${uid}-field`}>{translations("Zoom the Image")}</FieldLabel>
        <Input
          id={`${uid}-field`}
          type="number"
          step={0.1}
          min={0.1}
          max={1}
          value={scale}
          onChange={(e) => setScale(Number(e.target.value))}
        />
      </Field>

      <div className={styles["cropper-container"]}>
        <LoadingOverlay visible={!isReady} />

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
      </div>

      <div className={`${styles["cancel-save-btn-container"]} flex justify-end gap-2`}>
        <Button variant="outline" onClick={handleCancelBtnClick}>
          {translations("Cancel")}
        </Button>

        <Button onClick={handleSaveBtnClick}>{translations("Save")}</Button>
      </div>
    </>
  );
}

export default ImageCropModal;
