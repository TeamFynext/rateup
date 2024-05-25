import {
  ActionIcon,
  Button,
  Divider,
  FileButton,
  Group,
  NumberInput,
  Stack,
  Text,
  ThemeIcon,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconStar, IconTrash, IconUpload } from "@tabler/icons-react";
import { useCallback, useRef } from "react";
import { getSurveyThemeKeyOf } from "../SurveyTheme.constants";
import {
  useSelectedPageTab,
  useSurveyThemeContextValue,
  useSurveyThemeStateDispatch,
} from "../SurveyThemeContext";
import styles from "./stylescomponent/StylesComponent.module.css";
import { mmImageCropModalClassnames } from "../../../../utils/constants";

function LogoStyles() {
  const selectedPageTab = useSelectedPageTab();
  const surveyTheme = useSurveyThemeContextValue();
  const { logo } = surveyTheme[getSurveyThemeKeyOf(selectedPageTab)];

  const surveyThemeDispatch = useSurveyThemeStateDispatch();

  const resetLogoRef = useRef<() => void>(null);

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
    <Stack align="center" w={"100%"} gap={"1.5rem"}>
      <Group wrap="nowrap" gap="xs" w={"100%"}>
        <NumberInput
          min={10}
          max={100}
          placeholder="Height"
          label="Height (px)"
          name="height"
          style={{ flex: 1 }}
          classNames={{ label: styles["label"] }}
          value={logo.styles.height}
          onChange={handleHeightInputChange}
        />
        <NumberInput
          min={10}
          max={100}
          placeholder="Width"
          label="Width (px)"
          name="Width"
          style={{ flex: 1 }}
          classNames={{ label: styles["label"] }}
          value={logo.styles.width}
          onChange={handleWidthInputChange}
        />
      </Group>

      <Stack>
        <Divider label="Upload Logo" variant="dashed" w={"100%"} />
        <Group justify="space-between" w={"100%"}>
          <Group gap={"xs"}>
            <ThemeIcon>
              <IconStar size={15} />
            </ThemeIcon>
            <Text fw={100} c={"dark"} size="xs">
              Logo :{" "}
            </Text>
          </Group>
          <Group>
            <FileButton
              onChange={handleFileInputChange}
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              resetRef={resetLogoRef}
            >
              {(props) => (
                <Button
                  leftSection={<IconUpload size={16} />}
                  radius="18px"
                  size="xs"
                  {...props}
                >
                  Upload Image
                </Button>
              )}
            </FileButton>
            <ActionIcon
              color="red"
              size={"md"}
              radius={"xl"}
              disabled={!logo.logo}
              onClick={handleDeletBtnClick}
            >
              <IconTrash size={15} />
            </ActionIcon>
          </Group>
        </Group>
      </Stack>
    </Stack>
  );
}

export default LogoStyles;
