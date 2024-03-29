import { ActionIcon, Box, Button, FileButton, Group } from "@mantine/core";
import { IconDeviceDesktop, IconTrash, IconUpload } from "@tabler/icons-react";
import { useCallback } from "react";
import styles from "./LocalOrUnsplashImagePicker.module.css";
import mmCommonStyles from "../../../../../../../Modal/ModalManagerModals/mmCommonStyles.module.css";
import { modals } from "@mantine/modals";

function LocalOrUnsplashImagePicker({
  value,
  label,
  forDevice,
  onImageSelected,
}) {
  const handleUploadBtnClick = useCallback(() => {
    modals.openContextModal({
      modal: "imageSourceSelectorModal",
      title: "Select Upload Method",
      className: mmCommonStyles["mm-modal"],
      classNames: { header: "img-src-sel-modal-header" },
      size: "auto",
      centered: true,
      innerProps: {
        onImageSelected,
        forDevice,
      },
    });
  }, []);

  return (
    <Box className={styles["local-or-unsplash-image-picker-div"]}>
      <p className={styles["label-p"]}>
        <span>{`${label}`}</span>
        <span>{` :`}</span>
      </p>
      <Button
        className={styles["upload-bg-img-btn"]}
        leftSection={<IconUpload size={16} />}
        onClick={handleUploadBtnClick}
      >
        Upload
      </Button>
      <Box className={styles["delete-bg-img-btn-container"]}>
        <ActionIcon
          className={styles["delete-bg-img-btn"]}
          disabled={!value}
          onClick={() => onImageSelected(null)}
        >
          <IconTrash size={16} />
        </ActionIcon>
      </Box>
    </Box>
  );
}

export default LocalOrUnsplashImagePicker;
