import { IconTrash, IconUpload } from "@tabler/icons-react";
import { useCallback, useRef, useState } from "react";

import ImageCropModal from "@/components/Modal/ModalManagerModals/ImageCropModal/index.tsx";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { useDisclosure } from "@/hooks/useDisclosure";

import { useThemeDispatch, useThemeObj } from "../../../../ThemeContext/ThemeContext.tsx";

import styles from "./LogoEditor.module.css";

function LogoEditor() {
  const {
    logo: {
      styles: { width, height },
      logoUrl,
    },
  } = useThemeObj();
  const themeDispatch = useThemeDispatch();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const resetFileInput = useCallback(() => {
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const [cropModalOpened, { open: openCropModal, close: closeCropModal }] = useDisclosure(false);
  const [cropModalProps, setCropModalProps] = useState<{
    imageUrl: string;
    imageName?: string;
    onSaveClick?: (result: { file?: File; url: string; source?: string } | null) => void;
    onCancelClick?: () => void;
    aspectRatio?: number;
  } | null>(null);

  const handleLogoWidthChange = useCallback((value: string | number) => {
    themeDispatch({
      type: "logo-width-change",
      payload: value,
    });
  }, []);

  const handleLogoHeightChange = useCallback((value: string | number) => {
    themeDispatch({
      type: "logo-height-change",
      payload: value,
    });
  }, []);

  const onCroppedImgSave = useCallback(
    (url: { file?: File; url: string; source?: string } | null) => {
      themeDispatch({
        type: "logo-file-change",
        payload: url,
      });
      resetFileInput();
    },
    [],
  );

  const onCroppedImgCancel = useCallback(() => {
    resetFileInput();
  }, []);

  const handleLogoFileChange = useCallback((fileOrNull: File | null) => {
    if (fileOrNull) {
      const { name } = fileOrNull;
      const url = URL.createObjectURL(fileOrNull);
      setCropModalProps({
        imageUrl: url,
        imageName: name,
        onSaveClick: onCroppedImgSave,
        onCancelClick: onCroppedImgCancel,
        aspectRatio: 4 / 3,
      });
      openCropModal();
    } else {
      themeDispatch({
        type: "logo-file-change",
        payload: null,
      });
    }
  }, []);

  const handleDeletBtnClick = useCallback(() => {
    handleLogoFileChange(null);
    resetFileInput();
  }, []);

  return (
    <div className={styles["logo-editor-div"]}>
      <div className={`style-section-div`}>
        <h2>Width</h2>
        <Slider
          value={[Number(width ?? 0)]}
          onValueChange={(value) => handleLogoWidthChange(Array.isArray(value) ? value[0] : value)}
          step={1}
          min={30}
          max={150}
        />
      </div>

      <div className={`style-section-div`}>
        <h2>Height</h2>
        <Slider
          value={[Number(height ?? 0)]}
          onValueChange={(value) => handleLogoHeightChange(Array.isArray(value) ? value[0] : value)}
          step={1}
          min={30}
          max={150}
        />
      </div>

      <div className={`style-section-div`}>
        <h2>Logo</h2>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg"
            className="hidden"
            onChange={(e) => handleLogoFileChange(e.target.files?.[0] ?? null)}
          />
          <Button className={styles["upload-btn"]} onClick={() => fileInputRef.current?.click()}>
            <IconUpload size={16} data-icon="inline-start" />
            Upload
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className={styles["delete-logo-btn"]}
            disabled={!logoUrl}
            onClick={handleDeletBtnClick}
          >
            <IconTrash size={16} />
          </Button>
        </div>
      </div>
      <Dialog open={cropModalOpened} onOpenChange={(open) => !open && closeCropModal()}>
        <DialogContent>
          <DialogTitle>Crop Image</DialogTitle>
          {cropModalProps && (
            <ImageCropModal
              context={{ closeModal: closeCropModal }}
              id="imageCropModal"
              innerProps={cropModalProps}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default LogoEditor;
