import { ActionIcon, Button, FileButton, Group, Modal, NumberInput, Stack } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconTrash, IconUpload } from "@tabler/icons-react";
import { useCallback, useRef, useState } from "react";

import ImageCropModal from "@/components/Modal/ModalManagerModals/ImageCropModal/index.tsx";
import { mmImageCropModalClassnames } from "@/utils/constants.ts";

import { getSurveyThemeKeyOf } from "../SurveyTheme.constants";
import {
  useSelectedPageTab,
  useSurveyThemeContextValue,
  useSurveyThemeStateDispatch,
} from "../SurveyThemeContext.tsx";

import styles from "./stylescomponent/StylesComponent.module.css";

function LogoStyles() {
  const selectedPageTab = useSelectedPageTab();
  const surveyTheme = useSurveyThemeContextValue();
  const { logo } = surveyTheme[getSurveyThemeKeyOf(selectedPageTab)];

  const surveyThemeDispatch = useSurveyThemeStateDispatch();

  const resetLogoRef = useRef<() => void>(null);

  const [cropModalOpened, { open: openCropModal, close: closeCropModal }] = useDisclosure(false);
  const [cropModalProps, setCropModalProps] = useState(null);

  const handleHeightInputChange = useCallback((value) => {
    surveyThemeDispatch({
      type: "logo-height-change",
      payload: value,
    });
  }, []);

  const handleWidthInputChange = useCallback((value) => {
    surveyThemeDispatch({
      type: "logo-width-change",
      payload: value,
    });
  }, []);

  const onCroppedImgSave = useCallback((obj) => {
    const { file, url } = obj;
    surveyThemeDispatch({
      type: "logo-file-change",
      payload: {
        file,
        url,
      },
    });
    resetLogoRef.current?.();
  }, []);

  const onCroppedImgCancel = useCallback(() => {
    resetLogoRef.current?.();
  }, []);

  const handleFileInputChange = useCallback(
    (value) => {
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

      resetLogoRef.current?.();
    },
    [onCroppedImgSave, onCroppedImgCancel],
  );

  const handleDeletBtnClick = useCallback(() => {
    handleFileInputChange("");
    resetLogoRef.current?.();
  }, []);

  return (
    <Stack
      className={`${styles["style-inputs-container"]} style-inputs-container ${styles["logo-styles"]} logo-style-inputs-container`}
    >
      <Group wrap="nowrap" gap="lg" className={styles["logo-styles-number-inputs-container"]}>
        <NumberInput
          min={10}
          max={200}
          placeholder="Height"
          label="Height (px)"
          name="height"
          classNames={{ label: styles["label"] }}
          value={logo?.styles.height}
          onChange={handleHeightInputChange}
        />
        <NumberInput
          min={10}
          max={200}
          placeholder="Width"
          label="Width (px)"
          name="Width"
          classNames={{ label: styles["label"] }}
          value={logo?.styles.width}
          onChange={handleWidthInputChange}
        />
      </Group>

      <Stack>
        <Group className={styles["logo-styles-logo-upload-file-input-container"]}>
          <Group>
            <FileButton
              onChange={handleFileInputChange}
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              resetRef={resetLogoRef}
            >
              {(props) => (
                <Button leftSection={<IconUpload size={16} />} radius="18px" size="xs" {...props}>
                  Upload
                </Button>
              )}
            </FileButton>
            <ActionIcon
              color="red"
              size={"md"}
              radius={"xl"}
              disabled={!logo?.logo}
              onClick={handleDeletBtnClick}
            >
              <IconTrash size={15} />
            </ActionIcon>
          </Group>
        </Group>
      </Stack>
      <Modal
        opened={cropModalOpened}
        onClose={closeCropModal}
        title="Crop Image"
        centered
        classNames={mmImageCropModalClassnames}
      >
        {cropModalProps && (
          <ImageCropModal
            context={{ closeModal: closeCropModal }}
            id="imageCropModal"
            innerProps={cropModalProps}
          />
        )}
      </Modal>
    </Stack>
  );
}

export default LogoStyles;
