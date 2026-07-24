import { useId, useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { Cropper, type CropperRef } from "@/components/Cropper/Cropper.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { Field, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { LoadingOverlay } from "@/components/ui/loading-overlay.tsx";
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
  const uid = useId();
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
    <Dialog
      open={opened}
      onOpenChange={(next) => {
        if (!next) {
          onclose();
          setScale(0.4);
        }
      }}
    >
      <DialogContent className="flex max-h-[90vh] flex-col gap-5 overflow-auto">
        <DialogHeader>
          <DialogTitle className="text-center">{translations("Crop Image")}</DialogTitle>
        </DialogHeader>
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

          <Cropper
            ref={cropperRef}
            src={image}
            aspectRatio={aspect}
            freeMode={freeMode}
            onReady={() => setIsReady(true)}
          />
        </div>
        <div className={`${styles["cancel-save-btn-container"]} flex justify-end gap-2`}>
          <Button variant="outline" onClick={handleCancelBtnClick}>
            {translations("Cancel")}
          </Button>
          <Button onClick={handleSaveBtnClick}>{translations("Save")}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
