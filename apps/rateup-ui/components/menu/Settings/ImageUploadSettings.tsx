import React, { useRef, useState } from "react";
import { Group, FileButton, Button, Text, Box } from "@mantine/core";
import { IconTrash, IconUpload } from "@tabler/icons-react";
import { RateupButtonPrimary } from "components/Button/RateupButtons";
import { ActionIconCommon } from "../ActionIcon/ActionIconCommon";
import { useDisclosure } from "@mantine/hooks";
import { UnsplashModal } from "components/Modal/UnsplashModal";
import { ImageCropModal } from "components/Modal/ImageCropModal";
import { MAX_FILE_SIZE_IN_BYTE, MAX_FILE_SIZE_IN_MB } from "utils/constants";
import { showErrorToast } from "utils/notifications";
import { ImageUploadMethodModal } from "components/Modal/ImageUploadMethodModal";

const ImageUploadSettings = ({
  form,
  backgroundImage,
  setBackgroundImage,
  mobileBackgroundImage,
  setMobileBackgroundImage,
  setImageToDelete,
}) => {
  const [aspectRatio, setAspectRatio] = useState(16 / 9);
  const [imageType, setImageType] = useState("");
  const imageUploadBtnRef = useRef<HTMLButtonElement>(null);

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
    }
  };
  const handlePictureBackground = () => {
    setAspectRatio(8 / 3);
    toggleMethodSelectionDialog();
    setImageType("backgroundImage");
  };
  const handlePictureMobileBackground = () => {
    setAspectRatio(3 / 4);
    toggleMethodSelectionDialog();
    setImageType("mobileBackgroundImage");
  };
  const handleBgPick = (e: File | null) => {
    if (!e) return;
    if (e.size > MAX_FILE_SIZE_IN_BYTE) {
      return showErrorToast(`Max file size is ${MAX_FILE_SIZE_IN_MB} MB`);
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
    }
    if (!form?.values?.unsplashImage[type]) {
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
    <Group mt={"md"}>
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
      <Box mt={-12}>
        <Text size="xs" lineClamp={1} h={17}>
          {getFileNameFromUrl(
            mobileBackgroundImage
              ? mobileBackgroundImage?.name
              : form?.values?.mobileBackgroundImage,
            !!mobileBackgroundImage,
          )}
        </Text>
        <Group>
          <RateupButtonPrimary
            leftIcon={<IconUpload size={16} />}
            title="Upload Mobile Image"
            size="sm"
            onClick={handlePictureMobileBackground}
          />
          <ActionIconCommon
            handleClick={() => resetImage("mobileBackgroundImage")}
            disabled={!form?.values?.mobileBackgroundImage}
            label="Delete"
          >
            <IconTrash />
          </ActionIconCommon>
        </Group>
      </Box>
      <Box mt={-12}>
        <Text size="xs" lineClamp={1} h={17}>
          {getFileNameFromUrl(
            backgroundImage
              ? backgroundImage?.name
              : form?.values?.backgroundImage,
            !!backgroundImage,
          )}
        </Text>
        <Group>
          <RateupButtonPrimary
            leftIcon={<IconUpload size={16} />}
            title="Upload Tablet Image"
            size="sm"
            onClick={handlePictureBackground}
          />
          <ActionIconCommon
            handleClick={() => resetImage("backgroundImage")}
            disabled={!form?.values?.backgroundImage}
            label="Delete"
          >
            <IconTrash />
          </ActionIconCommon>
        </Group>
      </Box>
      <FileButton
        onChange={handleBgPick}
        accept="image/png,image/jpeg,image/svg+xml,image/webp"
      >
        {(props) => (
          <Button ref={imageUploadBtnRef} display={"none"} {...props} />
        )}
      </FileButton>
    </Group>
  );
};

export default ImageUploadSettings;

export function getFileNameFromUrl(url: any, isNewFile: boolean) {
  if (isNewFile) return url;
  const pattern = /^[^-]+-/;
  const name = url?.replace(pattern, "");
  return name?.split("?crop=focalpoint")[0];
}
