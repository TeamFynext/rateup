"use client";

import React, { useRef, useState } from "react";

import { Box, Button, FileButton, Group, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconTrash, IconUpload } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { RateupButtonPrimary } from "@/components/Button/RateupButtons";
import { ImageCropModal } from "@/components/Modal/ImageCropModal";
import { ImageUploadMethodModal } from "@/components/Modal/ImageUploadMethodModal";
import { UnsplashModal } from "@/components/Modal/UnsplashModal";
import { MAX_FILE_SIZE_IN_BYTE, MAX_FILE_SIZE_IN_MB } from "@/utils/constants";

import { ActionIconCommon } from "../ActionIcon/ActionIconCommon";

const ImageUploadSettings = ({
  form,
  backgroundImage,
  setBackgroundImage,
  mobileBackgroundImage,
  setMobileBackgroundImage,
  logo,
  setLogo,
  setImageToDelete,
}) => {
  const [aspectRatio, setAspectRatio] = useState(5 / 1);
  const [imageType, setImageType] = useState("");
  const imageUploadBtnRef = useRef<HTMLButtonElement>(null);
  const resetLogoRef = useRef(null);
  const translations = useTranslations();
  const [
    openedMethodSelectionDialog,
    { toggle: toggleMethodSelectionDialog, close: closeMethodSelectionDialog },
  ] = useDisclosure(false);
  const [selectedUnslashImage, setSelectedUnslashImage] = useState({
    url: "",
    name: "",
  });
  const [
    openedUnsplashDialog,
    { toggle: toggleUnsplashDialog, close: closeUnsplashDialog },
  ] = useDisclosure(false);
  const [
    openedCropDialog,
    { toggle: toggleCropDialog, close: closeCropDialog },
  ] = useDisclosure(false);

  const handleUnsplashImageSave = (
    unsplashImage: string,
    imageName: string,
  ) => {
    setSelectedUnslashImage({
      url: unsplashImage,
      name: imageName,
    });
    toggleCropDialog();
  };
  let labelColor =
    "light-dark(var(--mantine-color-gray-7), var(--mantine-color-gray-4))";

  const handleCropImageSave = (cropedImage) => {
    let imageUrl =
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
      setLogo(cropedImage);
    }
  };
  const handlePictureBackground = () => {
    setAspectRatio(5 / 1);
    toggleMethodSelectionDialog();
    setImageType("backgroundImage");
  };
  const handlePictureMobileBackground = () => {
    setAspectRatio(3 / 2);
    toggleMethodSelectionDialog();
    setImageType("mobileBackgroundImage");
  };
  const onChangeLogo = (event: File) => {
    if (!event) return;
    if (event.size > MAX_FILE_SIZE_IN_BYTE) {
      toast.error(`Max file size is ${MAX_FILE_SIZE_IN_MB} MB`);
      return;
    }
    setSelectedUnslashImage({
      url: URL.createObjectURL(event),
      name: event.name,
    });
    toggleCropDialog();
    setAspectRatio(4 / 3);
    setImageType("logo");
    resetLogoRef?.current?.();
  };

  const handleBgPick = (e: File | null) => {
    if (!e) return;
    if (e.size > MAX_FILE_SIZE_IN_BYTE) {
      return toast.error(`Max file size is ${MAX_FILE_SIZE_IN_MB} MB`);
    }
    handleUnsplashImageSave(URL.createObjectURL(e), e.name);
  };
  const handleUploadMethod = (type: string) => {
    if (type === "unsplash") {
      toggleUnsplashDialog();
    } else {
      imageUploadBtnRef?.current?.click();
    }
  };
  const resetImage = (type: string) => {
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
  return (
    <>
      <UnsplashModal
        handleUnsplashImageSave={handleUnsplashImageSave}
        opened={openedUnsplashDialog}
        onclose={closeUnsplashDialog}
      />
      <ImageCropModal
        opened={openedCropDialog}
        onclose={closeCropDialog}
        imageName={selectedUnslashImage.name}
        handleCropImageSave={handleCropImageSave}
        image={selectedUnslashImage.url}
        aspect={aspectRatio}
      />
      <ImageUploadMethodModal
        onClose={closeMethodSelectionDialog}
        opened={openedMethodSelectionDialog}
        handleUploadMethod={handleUploadMethod}
      />
      <Box>
        <Text size="xs" lineClamp={1} h={17} c={labelColor}>
          {translations("Default Banner Image")}
        </Text>
        <Group>
          <RateupButtonPrimary
            leftIcon={<IconUpload size={16} />}
            title={translations("Upload Mobile Image")}
            size="sm"
            variant="light"
            onClick={handlePictureMobileBackground}
          />
          <ActionIconCommon
            handleClick={() => resetImage("mobileBackgroundImage")}
            disabled={!form?.values?.mobileBackgroundImage}
            label={translations("Delete")}
          >
            <IconTrash />
          </ActionIconCommon>
        </Group>
        <Text size="xs" lineClamp={1} h={17}>
          {getFileNameFromUrl(
            mobileBackgroundImage
              ? mobileBackgroundImage?.name
              : form?.values?.mobileBackgroundImage,
            !!mobileBackgroundImage,
          )}
        </Text>
      </Box>
      <Box>
        <Text size="xs" lineClamp={1} h={17} c={labelColor}>
          {translations("Default Banner Image")}
        </Text>
        <Group>
          <RateupButtonPrimary
            leftIcon={<IconUpload size={16} />}
            title={translations("Upload Tablet Image")}
            size="sm"
            variant="light"
            onClick={handlePictureBackground}
          />
          <ActionIconCommon
            handleClick={() => resetImage("backgroundImage")}
            disabled={!form?.values?.backgroundImage}
            label={translations("Delete")}
          >
            <IconTrash />
          </ActionIconCommon>
        </Group>
        <Text size="xs" lineClamp={1} h={17}>
          {getFileNameFromUrl(
            backgroundImage
              ? backgroundImage?.name
              : form?.values?.backgroundImage,
            !!backgroundImage,
          )}
        </Text>
      </Box>
      <Box>
        <Text size="xs" lineClamp={1} h={17} c={labelColor}>
          {translations("Logo")}
        </Text>
        <Group>
          <FileButton
            onChange={onChangeLogo}
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            resetRef={resetLogoRef}
          >
            {(props) => (
              <RateupButtonPrimary
                leftIcon={<IconUpload size={16} />}
                title={translations("Upload Logo")}
                size="sm"
                variant="light"
                {...props}
              />
            )}
          </FileButton>
          <ActionIconCommon
            handleClick={() => resetImage("logo")}
            disabled={!form?.values?.logo}
            label={translations("Delete")}
          >
            <IconTrash />
          </ActionIconCommon>
        </Group>
        <Text size="xs" lineClamp={1} h={17}>
          {getFileNameFromUrl(logo ? logo?.name : form?.values?.logo, !!logo)}
        </Text>
      </Box>
      <FileButton
        onChange={handleBgPick}
        accept="image/png,image/jpeg,image/svg+xml,image/webp"
      >
        {(props) => (
          <Button ref={imageUploadBtnRef} display={"none"} {...props} />
        )}
      </FileButton>
    </>
  );
};

export default ImageUploadSettings;

export function getFileNameFromUrl(url: any, isNewFile: boolean) {
  if (isNewFile) return url;
  const pattern = /^[^-]+-/;
  const name = url?.replace(pattern, "");
  return name?.split("?crop=focalpoint")[0];
}
