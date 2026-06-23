"use client";

import type { ChangeEvent } from "react";
import React, { useRef, useState } from "react";

import { IconTrash, IconUpload } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { ImageCropModal } from "@/components/Modal/ImageCropModal.tsx";
import { ImageUploadMethodModal } from "@/components/Modal/ImageUploadMethodModal.tsx";
import { UnsplashModal } from "@/components/Modal/UnsplashModal.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  MAX_FILE_SIZE_IN_BYTE,
  MAX_FILE_SIZE_IN_MB,
} from "@/utils/constants.ts";

type ImageFieldName = "backgroundImage" | "mobileBackgroundImage" | "logo";

type ImageUploadSettingsProps = {
  form: {
    values: Record<string, any>;
    setFieldValue: (field: string, value: unknown) => void;
  };
  backgroundImage: File | null;
  setBackgroundImage: React.Dispatch<React.SetStateAction<File | null>>;
  mobileBackgroundImage: File | null;
  setMobileBackgroundImage: React.Dispatch<React.SetStateAction<File | null>>;
  logo: File | null;
  setLogo: React.Dispatch<React.SetStateAction<File | null>>;
  setImageToDelete: React.Dispatch<
    React.SetStateAction<Array<{ Key: string }>>
  >;
};

const ImageUploadSettings = ({
  form,
  backgroundImage,
  setBackgroundImage,
  mobileBackgroundImage,
  setMobileBackgroundImage,
  logo,
  setLogo,
  setImageToDelete,
}: ImageUploadSettingsProps) => {
  const [aspectRatio, setAspectRatio] = useState(5 / 1);
  const [imageType, setImageType] = useState("");
  const backgroundFileInputRef = useRef<HTMLInputElement>(null);
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const { t: translations } = useTranslation();
  const [openedMethodSelectionDialog, setOpenedMethodSelectionDialog] =
    useState(false);
  const [selectedUnslashImage, setSelectedUnslashImage] = useState({
    url: "",
    name: "",
  });
  const [openedUnsplashDialog, setOpenedUnsplashDialog] = useState(false);
  const [openedCropDialog, setOpenedCropDialog] = useState(false);

  const handleUnsplashImageSave = (
    unsplashImage: string,
    imageName: string,
  ) => {
    setSelectedUnslashImage({
      url: unsplashImage,
      name: imageName,
    });
    setOpenedCropDialog(true);
  };

  const handleCropImageSave = (cropedImage: File | string) => {
    const imageUrl =
      typeof cropedImage === "string"
        ? cropedImage
        : URL.createObjectURL(cropedImage);
    if (imageType === "backgroundImage") {
      form?.setFieldValue("backgroundImage", imageUrl);
      if (typeof cropedImage === "string") {
        form.setFieldValue("unsplashImage", {
          ...form?.values.unsplashImage,
          backgroundImage: true,
        });
      } else {
        form.setFieldValue("unsplashImage", {
          ...form?.values.unsplashImage,
          backgroundImage: false,
        });
        setBackgroundImage(cropedImage);
      }
    } else if (imageType === "mobileBackgroundImage") {
      form?.setFieldValue("mobileBackgroundImage", imageUrl);

      if (typeof cropedImage === "string") {
        form.setFieldValue("unsplashImage", {
          ...form?.values.unsplashImage,
          mobileBackgroundImage: true,
        });
      } else {
        form.setFieldValue("unsplashImage", {
          ...form?.values.unsplashImage,
          mobileBackgroundImage: false,
        });
        setMobileBackgroundImage(cropedImage);
      }
    } else if (imageType === "logo") {
      form?.setFieldValue("logo", imageUrl);
      if (typeof cropedImage !== "string") {
        setLogo(cropedImage);
      }
    }
  };
  const handlePictureBackground = () => {
    setAspectRatio(5 / 1);
    setOpenedMethodSelectionDialog(true);
    setImageType("backgroundImage");
  };
  const handlePictureMobileBackground = () => {
    setAspectRatio(3 / 2);
    setOpenedMethodSelectionDialog(true);
    setImageType("mobileBackgroundImage");
  };
  const onChangeLogo = (file: File | null) => {
    if (!file) return;
    if (file.size > MAX_FILE_SIZE_IN_BYTE) {
      toast.error(`Max file size is ${MAX_FILE_SIZE_IN_MB} MB`);
      return;
    }
    setSelectedUnslashImage({
      url: URL.createObjectURL(file),
      name: file.name,
    });
    setOpenedCropDialog(true);
    setAspectRatio(4 / 3);
    setImageType("logo");
    if (logoFileInputRef.current) {
      logoFileInputRef.current.value = "";
    }
  };

  const handleBgPick = (file: File | null) => {
    if (!file) return;
    if (file.size > MAX_FILE_SIZE_IN_BYTE) {
      return toast.error(`Max file size is ${MAX_FILE_SIZE_IN_MB} MB`);
    }
    handleUnsplashImageSave(URL.createObjectURL(file), file.name);
  };

  const handleFileInputChange = (
    event: ChangeEvent<HTMLInputElement>,
    onPick: (file: File | null) => void,
  ) => {
    const file = event.target.files?.[0] ?? null;
    onPick(file);
    event.target.value = "";
  };

  const handleUploadMethod = (type: string) => {
    if (type === "unsplash") {
      setOpenedUnsplashDialog(true);
    } else {
      backgroundFileInputRef.current?.click();
    }
  };

  const resetImage = (type: ImageFieldName) => {
    if (type === "backgroundImage") {
      setBackgroundImage(null);
    } else if (type === "mobileBackgroundImage") {
      setMobileBackgroundImage(null);
    } else if (type === "logo") {
      setLogo(null);
    }
    if (!form?.values?.unsplashImage?.[type]) {
      if (!form?.values?.[type]?.startsWith("blob:")) {
        setImageToDelete((prev) => [...prev, { Key: form?.values?.[type] }]);
      }
    }

    form.setFieldValue(`unsplashImage`, {
      ...form?.values?.unsplashImage,
      [type]: false,
    });
    form.setFieldValue(type, "");
  };

  const handleLogoUploadClick = () => {
    if (logoFileInputRef.current) {
      logoFileInputRef.current?.click();
    }
  };

  return (
    <>
      <UnsplashModal
        handleUnsplashImageSave={handleUnsplashImageSave}
        opened={openedUnsplashDialog}
        onclose={() => setOpenedUnsplashDialog(false)}
      />
      <ImageCropModal
        opened={openedCropDialog}
        onclose={() => setOpenedCropDialog(false)}
        imageName={selectedUnslashImage.name}
        handleCropImageSave={handleCropImageSave}
        image={selectedUnslashImage.url}
        aspect={aspectRatio}
      />
      <ImageUploadMethodModal
        onClose={() => setOpenedMethodSelectionDialog(false)}
        opened={openedMethodSelectionDialog}
        handleUploadMethod={handleUploadMethod}
      />
      <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
        <RenderImageSetting
          label={translations("Default Banner Image")}
          buttonLabel={translations("Upload Desktop Image")}
          currentValue={
            mobileBackgroundImage
              ? mobileBackgroundImage.name
              : form?.values?.mobileBackgroundImage
          }
          isDisabled={!form?.values?.mobileBackgroundImage}
          isNewFile={!!mobileBackgroundImage}
          onUpload={handlePictureMobileBackground}
          onDelete={() => resetImage("mobileBackgroundImage")}
        />

        <RenderImageSetting
          label={translations("Default Banner Image")}
          buttonLabel={translations("Upload Desktop Image")}
          currentValue={
            backgroundImage
              ? backgroundImage.name
              : form?.values?.backgroundImage
          }
          isDisabled={!form?.values?.backgroundImage}
          isNewFile={!!backgroundImage}
          onUpload={handlePictureBackground}
          onDelete={() => resetImage("backgroundImage")}
        />

        <RenderImageSetting
          label={translations("Logo")}
          buttonLabel={translations("Upload Logo")}
          currentValue={logo ? logo.name : form?.values?.logo}
          isDisabled={!form?.values?.logo}
          isNewFile={!!logo}
          onUpload={handleLogoUploadClick}
          onDelete={() => resetImage("logo")}
        />
      </div>
      <Input
        ref={backgroundFileInputRef}
        type="file"
        className="hidden"
        accept="image/png,image/jpeg,image/svg+xml,image/webp"
        onChange={(event) => handleFileInputChange(event, handleBgPick)}
      />
      <Input
        ref={logoFileInputRef}
        type="file"
        className="hidden"
        accept="image/png,image/jpeg,image/svg+xml,image/webp"
        onChange={(event) => handleFileInputChange(event, onChangeLogo)}
      />
    </>
  );
};

export default ImageUploadSettings;

function getFileNameFromUrl(url: any, isNewFile: boolean) {
  if (isNewFile) return url;
  const pattern = /^[^-]+-/;
  const name = url?.replace(pattern, "");
  return name?.split("?crop=focalpoint")[0];
}

const RenderImageSetting = ({
  label,
  buttonLabel,
  currentValue,
  isDisabled,
  isNewFile,
  onUpload,
  onDelete,
}: {
  label: string;
  buttonLabel: string;
  currentValue?: string;
  isDisabled: boolean;
  isNewFile: boolean;
  onUpload: () => void;
  onDelete: () => void;
}) => {
  const { t: translations } = useTranslation();
  return (
    <div className="flex flex-col gap-2">
      <p className="truncate text-xs text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onUpload}>
          <IconUpload data-icon="inline-start" />
          {buttonLabel}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={onDelete}
          disabled={isDisabled}
          aria-label={translations("Delete")}
          title={translations("Delete")}
        >
          <IconTrash />
        </Button>
      </div>
      <p className="truncate text-xs text-muted-foreground">
        {getFileNameFromUrl(currentValue, isNewFile)}
      </p>
    </div>
  );
};
