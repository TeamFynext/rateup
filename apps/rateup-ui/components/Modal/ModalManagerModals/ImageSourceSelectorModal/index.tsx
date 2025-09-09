"use client";

import { useCallback } from "react";

import { Button, FileButton, Group, Image } from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconBrandUnsplash, IconUpload } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { mmImageCropModalClassnames } from "../../../../utils/constants";
import { getFileUrlFromKey } from "../../../../utils/file-upload/upload";
import imageCropModalStyles from "../ImageCropModal/ImageCropModal.module.css";
import commonStyles from "../mmCommonStyles.module.css";
import styles from "./ImageSourceSelectorModal.module.css";

function ImageSourceSelectorModal({ context, id: thisModalId, innerProps }) {
  const { onImageSelected, forDevice } = innerProps;
  const aspectRatio = forDevice === "desktop" ? 16 / 9 : 9 / 16;
  const translations = useTranslations();
  const handleFileBtnValueChange = useCallback(
    (fileObj) => {
      if (!fileObj) {
        // context.closeModal(thisModalId);
        onImageSelected(null);
      } else if (fileObj) {
        const { name } = fileObj;
        const url = URL.createObjectURL(fileObj);
        modals.openContextModal({
          modal: "imageCropModal",
          title: translations("Crop Image"),
          centered: true,
          classNames: mmImageCropModalClassnames,
          innerProps: {
            imageUrl: url,
            imageName: name,
            onSaveClick: onImageSelected,
            aspectRatio,
          },
        });
      }
    },
    [onImageSelected],
  );

  const handleUnsplashBtnClick = useCallback(() => {
    modals.openContextModal({
      modal: "unsplashImageSelectorModal",
      title: translations("Unsplash Images"),
      centered: true,
      className: commonStyles["mm-modal"],
      classNames: {
        header: commonStyles["unsplash-image-selector-modal-header"],
      },
      size: "80vw",
      innerProps: {
        onImageSelected,
        aspectRatio,
      },
    });
  }, [onImageSelected, aspectRatio]);

  return (
    <Group className={styles["container"]}>
      <FileButton onChange={handleFileBtnValueChange}>
        {(props) => {
          return (
            <Button
              className={styles["card"]}
              {...props}
              rightSection={<IconUpload size={16} />}
            >
              {translations("Upload from Device")}
            </Button>
          );
        }}
      </FileButton>

      <Button
        className={styles["card"]}
        rightSection={<IconBrandUnsplash size={16} />}
        onClick={handleUnsplashBtnClick}
      >
        {translations("Select from Unsplash")}
      </Button>
    </Group>
  );
}

export default ImageSourceSelectorModal;
