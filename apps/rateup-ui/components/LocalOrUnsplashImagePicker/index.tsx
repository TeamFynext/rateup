import { useCallback } from "react";

import { ActionIcon, Box, Button, Group } from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconTrash, IconUpload } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import mmCommonStyles from "../Modal/ModalManagerModals/mmCommonStyles.module.css";
import styles from "./LocalOrUnsplashImagePicker.module.css";

function LocalOrUnsplashImagePicker({
  value,
  label,
  forDevice,
  onImageSelected,
}) {
  const translations = useTranslations();
  const handleUploadBtnClick = useCallback(() => {
    modals.openContextModal({
      modal: "imageSourceSelectorModal",
      title: translations("Select Upload Method"),
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
    <Box
      className={`${styles["local-or-unsplash-image-picker-div"]} local-or-unsplash-image-picker-div`}
    >
      <p
        className={`${styles["label-p"]} local-or-unsplash-image-picker-label`}
      >
        <span>{`${label}`}</span>
        <span>{` :`}</span>
      </p>
      <Group>
        <Button
          className={styles["upload-bg-img-btn"]}
          leftSection={<IconUpload size={16} />}
          onClick={handleUploadBtnClick}
        >
          {translations("Upload")}
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
      </Group>
    </Box>
  );
}

export default LocalOrUnsplashImagePicker;
