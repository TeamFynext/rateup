import { ActionIcon, Box, Button, Group, Modal } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconTrash, IconUpload } from "@tabler/icons-react";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";

import ImageSourceSelectorModal from "../Modal/ModalManagerModals/ImageSourceSelectorModal/index.tsx";

import mmCommonStyles from "../Modal/ModalManagerModals/mmCommonStyles.module.css";
import styles from "./LocalOrUnsplashImagePicker.module.css";

function LocalOrUnsplashImagePicker({ value, label, forDevice, onImageSelected }) {
  const { t: translations } = useTranslation();
  const [uploadModalOpened, { open: openUploadModal, close: closeUploadModal }] =
    useDisclosure(false);
  const handleUploadBtnClick = useCallback(() => {
    openUploadModal();
  }, [openUploadModal]);

  return (
    <Box
      className={`${styles["local-or-unsplash-image-picker-div"]} local-or-unsplash-image-picker-div`}
    >
      <p className={`${styles["label-p"]} local-or-unsplash-image-picker-label`}>
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
      <Modal
        opened={uploadModalOpened}
        onClose={closeUploadModal}
        title={translations("Select Upload Method")}
        className={mmCommonStyles["mm-modal"]}
        classNames={{ header: "img-src-sel-modal-header" }}
        size="auto"
        centered
      >
        <ImageSourceSelectorModal
          context={{ closeModal: closeUploadModal }}
          id="imageSourceSelectorModal"
          innerProps={{ onImageSelected, forDevice }}
        />
      </Modal>
    </Box>
  );
}

export default LocalOrUnsplashImagePicker;
