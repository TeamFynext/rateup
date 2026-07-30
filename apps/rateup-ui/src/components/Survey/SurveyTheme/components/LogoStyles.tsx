import { IconTrash, IconUpload } from "@tabler/icons-react";
import { useId, useCallback, useRef, useState } from "react";

import ImageCropModal from "@/components/Modal/ModalManagerModals/ImageCropModal/index.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { Field, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";

import { getSurveyThemeKeyOf } from "../SurveyTheme.constants";
import {
  useSelectedPageTab,
  useSurveyThemeContextValue,
  useSurveyThemeStateDispatch,
} from "../SurveyThemeContext.tsx";

import styles from "./stylescomponent/StylesComponent.module.css";

function LogoStyles() {
  const uid = useId();
  const selectedPageTab = useSelectedPageTab();
  const surveyTheme = useSurveyThemeContextValue();
  const { logo } = surveyTheme[getSurveyThemeKeyOf(selectedPageTab)!];

  const surveyThemeDispatch = useSurveyThemeStateDispatch();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const resetLogoInput = () => {
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const [cropModalOpened, setCropModalOpened] = useState(false);
  const closeCropModal = () => setCropModalOpened(false);
  const openCropModal = () => setCropModalOpened(true);
  const [cropModalProps, setCropModalProps] = useState(null);

  const handleHeightInputChange = useCallback((value: string | number) => {
    surveyThemeDispatch({
      type: "logo-height-change",
      payload: value,
    });
  }, []);

  const handleWidthInputChange = useCallback((value: string | number) => {
    surveyThemeDispatch({
      type: "logo-width-change",
      payload: value,
    });
  }, []);

  const onCroppedImgSave = useCallback((obj: { file: File; url: string }) => {
    const { file, url } = obj;
    surveyThemeDispatch({
      type: "logo-file-change",
      payload: {
        file,
        url,
      },
    });
    resetLogoInput();
  }, []);

  const onCroppedImgCancel = useCallback(() => {
    resetLogoInput();
  }, []);

  const handleFileInputChange = useCallback(
    (value: File | "" | null) => {
      if (value) {
        const { name } = value;
        const url = URL.createObjectURL(value);
        setCropModalProps({
          imageUrl: url,
          imageName: name,
          onSaveClick: onCroppedImgSave,
          onCancelClick: onCroppedImgCancel,
          aspectRatio: 4 / 3,
        });
        openCropModal();
      } else {
        surveyThemeDispatch({
          type: "logo-file-change",
          payload: { file: null, url: "" },
        });
      }

      resetLogoInput();
    },
    [onCroppedImgSave, onCroppedImgCancel],
  );

  const handleDeletBtnClick = useCallback(() => {
    handleFileInputChange("");
    resetLogoInput();
  }, []);

  return (
    <div
      className={`flex flex-col ${styles["style-inputs-container"]} style-inputs-container logo-style-inputs-container`}
    >
      <div className="flex flex-nowrap justify-center gap-5">
        <Field className="flex-1">
          <FieldLabel htmlFor={`${uid}-height-px`} className={styles["label"]}>
            Height (px)
          </FieldLabel>
          <Input
            id={`${uid}-height-px`}
            type="number"
            min={10}
            max={200}
            placeholder="Height"
            name="height"
            value={logo?.styles.height}
            onChange={(e) => handleHeightInputChange(e.target.value)}
            className="rounded-xl"
          />
        </Field>
        <Field className="flex-1">
          <FieldLabel htmlFor={`${uid}-width-px`} className={styles["label"]}>
            Width (px)
          </FieldLabel>
          <Input
            id={`${uid}-width-px`}
            type="number"
            min={10}
            max={200}
            placeholder="Width"
            name="Width"
            value={logo?.styles.width}
            onChange={(e) => handleWidthInputChange(e.target.value)}
            className="rounded-xl"
          />
        </Field>
      </div>

      <div className="flex flex-col">
        <div className="flex justify-center">
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                handleFileInputChange(file);
              }}
            />
            <Button
              type="button"
              size="sm"
              className="rounded-[18px]"
              onClick={() => fileInputRef.current?.click()}
            >
              <IconUpload data-icon="inline-start" className="size-4" />
              Upload
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="icon-sm"
              className="rounded-full"
              disabled={!logo?.logo}
              onClick={handleDeletBtnClick}
            >
              <IconTrash className="size-[15px]" />
            </Button>
          </div>
        </div>
      </div>
      <Dialog
        open={cropModalOpened}
        onOpenChange={(next) => {
          if (!next) closeCropModal();
        }}
      >
        <DialogContent className="flex flex-col rounded-2xl">
          <DialogHeader>
            <DialogTitle className="w-full text-center text-lg font-bold">Crop Image</DialogTitle>
          </DialogHeader>
          <div className="flex flex-1 flex-col gap-5 overflow-auto">
            {cropModalProps && (
              <ImageCropModal
                context={{ closeModal: closeCropModal }}
                id="imageCropModal"
                innerProps={cropModalProps}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default LogoStyles;
