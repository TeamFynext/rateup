import { IconBrandUnsplash, IconUpload } from "@tabler/icons-react";
import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import type { SelectedImage } from "@/components/LocalOrUnsplashImagePicker/index.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { useDisclosure } from "@/hooks/useDisclosure";

import ImageCropModal from "../ImageCropModal/index.tsx";
import UnsplashImageSelectorModal from "../UnsplashImageSelectorModal/index.tsx";

import styles from "./ImageSourceSelectorModal.module.css";

function ImageSourceSelectorModal({
  context: _context,
  id: _thisModalId,
  innerProps,
}: {
  context: { closeModal: (id: string) => void };
  id: string;
  innerProps: {
    onImageSelected: (result: SelectedImage) => void;
    handleUnsplashImageSave?: (url: string, name: string) => void;
    aspectRatio?: number;
    forDevice?: string;
  };
}) {
  const { onImageSelected, forDevice } = innerProps;
  const aspectRatio = forDevice === "desktop" ? 16 / 9 : 9 / 16;
  const { t: translations } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [cropModalOpened, { open: openCropModal, close: closeCropModal }] = useDisclosure(false);
  const [cropModalProps, setCropModalProps] = useState(null);

  const handleFileBtnValueChange = useCallback(
    (fileObj: File | null) => {
      if (!fileObj) {
        onImageSelected(null);
      } else if (fileObj) {
        const { name } = fileObj;
        const url = URL.createObjectURL(fileObj);
        setCropModalProps({
          imageUrl: url,
          imageName: name,
          onSaveClick: onImageSelected,
          aspectRatio,
        });
        openCropModal();
      }
    },
    [onImageSelected],
  );

  const [unsplashModalOpened, { open: openUnsplashModal, close: closeUnsplashModal }] =
    useDisclosure(false);

  const handleUnsplashBtnClick = useCallback(() => {
    openUnsplashModal();
  }, [openUnsplashModal]);

  return (
    <div className={`${styles["container"]} flex items-center gap-4`}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFileBtnValueChange(e.target.files?.[0] ?? null)}
      />
      <Button
        variant="outline"
        className={styles["card"]}
        onClick={() => fileInputRef.current?.click()}
      >
        {translations("Upload from Device")}
        <IconUpload size={16} />
      </Button>
      <Button variant="outline" className={styles["card"]} onClick={handleUnsplashBtnClick}>
        {translations("Select from Unsplash")}
        <IconBrandUnsplash size={16} />
      </Button>
      <Dialog
        open={cropModalOpened}
        onOpenChange={(next) => {
          if (!next) closeCropModal();
        }}
      >
        <DialogContent className="flex max-h-[90vh] flex-col gap-5 overflow-auto">
          <DialogHeader>
            <DialogTitle className="text-center">{translations("Crop Image")}</DialogTitle>
          </DialogHeader>
          {cropModalProps && (
            <ImageCropModal
              context={{ closeModal: closeCropModal }}
              id="imageCropModal"
              innerProps={cropModalProps}
            />
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={unsplashModalOpened}
        onOpenChange={(next) => {
          if (!next) closeUnsplashModal();
        }}
      >
        <DialogContent className="max-h-[90vh] w-[80vw] overflow-auto sm:max-w-[80vw]">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl">
              {translations("Unsplash Images")}
            </DialogTitle>
          </DialogHeader>
          <UnsplashImageSelectorModal
            context={{ closeModal: closeUnsplashModal }}
            id="unsplashImageSelectorModal"
            innerProps={{ onImageSelected, aspectRatio }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ImageSourceSelectorModal;
