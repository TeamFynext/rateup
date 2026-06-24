import { ActionIcon, Box, Button, FileButton, Group, Slider } from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconTrash, IconUpload } from "@tabler/icons-react";
import { useCallback, useRef } from "react";

import { mmImageCropModalClassnames } from "@/utils/constants.ts";

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

  const fileBtnResetRef = useRef(null);

  const handleLogoWidthChange = useCallback((value) => {
    themeDispatch({
      type: "logo-width-change",
      payload: value,
    });
  }, []);

  const handleLogoHeightChange = useCallback((value) => {
    themeDispatch({
      type: "logo-height-change",
      payload: value,
    });
  }, []);

  const onCroppedImgSave = useCallback((url) => {
    themeDispatch({
      type: "logo-file-change",
      payload: url,
    });
    fileBtnResetRef.current?.();
  }, []);

  const onCroppedImgCancel = useCallback(() => {
    fileBtnResetRef.current?.();
  }, []);

  const handleLogoFileChange = useCallback((fileOrNull) => {
    if (fileOrNull) {
      const { name } = fileOrNull;
      const url = URL.createObjectURL(fileOrNull);
      modals.openContextModal({
        modal: "imageCropModal",
        title: "Crop Image",
        centered: true,
        classNames: mmImageCropModalClassnames,
        innerProps: {
          imageUrl: url,
          imageName: name,
          onSaveClick: onCroppedImgSave,
          onCancelClick: onCroppedImgCancel,
          aspectRatio: 4 / 3,
        },
      });
    } else {
      themeDispatch({
        type: "logo-file-change",
        payload: null,
      });
    }
  }, []);

  const handleDeletBtnClick = useCallback(() => {
    handleLogoFileChange(null);
    fileBtnResetRef.current?.();
  }, []);

  return (
    <Box className={styles["logo-editor-div"]}>
      <Box className={`style-section-div`}>
        <h2>Width</h2>
        <Slider
          value={width}
          onChange={handleLogoWidthChange}
          label={(value) => value}
          step={1}
          defaultValue={50}
          min={30}
          max={150}
        />
      </Box>

      <Box className={`style-section-div`}>
        <h2>Height</h2>
        <Slider
          value={height}
          onChange={handleLogoHeightChange}
          label={(value) => value}
          step={1}
          defaultValue={50}
          min={30}
          max={150}
        />
      </Box>

      <Box className={`style-section-div`}>
        <h2>Logo</h2>
        <Group>
          <FileButton
            onChange={handleLogoFileChange}
            accept="image/png,image/jpeg"
            resetRef={fileBtnResetRef}
          >
            {(props) => {
              return (
                <Button
                  className={styles["upload-btn"]}
                  leftSection={<IconUpload size={16} />}
                  {...props}
                >
                  Upload
                </Button>
              );
            }}
          </FileButton>

          <ActionIcon
            className={styles["delete-logo-btn"]}
            disabled={!logoUrl}
            onClick={handleDeletBtnClick}
          >
            <IconTrash size={16} />
          </ActionIcon>
        </Group>
      </Box>
    </Box>
  );
}

export default LogoEditor;
