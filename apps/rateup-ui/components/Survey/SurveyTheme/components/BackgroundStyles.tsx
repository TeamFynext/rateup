import {
  Stack,
  Button,
  FileButton,
  Text,
  Group,
  ActionIcon,
  Divider,
  ThemeIcon,
  Box,
} from "@mantine/core";
import {
  IconDeviceDesktop,
  IconDeviceMobile,
  IconEye,
  IconTrash,
  IconUpload,
} from "@tabler/icons-react";
import React, { useState, useRef, ReactNode, useCallback } from "react";
import { UnsplashModal } from "../../../Modal/UnsplashModal";
import { ImageCropModal } from "../../../Modal/ImageCropModal";
import { ImageUploadMethodModal } from "../../../Modal/ImageUploadMethodModal";
import { useDisclosure } from "@mantine/hooks";
import { Bg } from "../surveyTheme.types";
import { BgTab } from "../SurveyTheme.enums";
import { PreviewTypeEnum } from "../SurveyTheme.enums";
import CustomColorPicker from "../../ShareSurvey/components/CustomColorPicker";
import styles from "./stylescomponent/StylesComponent.module.css";

interface BackgroundStylesProps {
  currentStyles: Bg;
  setCurrentstyles: (key: string, value: any) => void;
}
function BackgroundStyles({
  currentStyles,
  setCurrentstyles,
}: BackgroundStylesProps) {
  const resetBgRef = useRef<() => void>(null);
  const resetMobileBgRef = useRef<() => void>(null);

  const [bgFileName, setBgFileName] = useState(null);
  const [mobileBgFileName, setMobileBgFileName] = useState(null);

  const [isFileLoading, setisFileLoading] = useState(false);
  const [aspectRatio, setAspectRatio] = useState(16 / 9);
  const [imageType, setImageType] = useState("");
  const [selectedImage, setSelectedImage] = useState({
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
  const [
    openedMethodSelectionDialog,
    { toggle: toggleMethodSelectionDialog, close: closeMethodSelectionDialog },
  ] = useDisclosure(false);
  const bgFileUploadBtnRef = useRef(null);
  const mobileBgFileUploadBtnRef = useRef(null);

  //----------onsubmit form -------------

  const handleFileChange = (value) => {
    if (!value) return;
    setAspectRatio(16 / 9);
    toggleMethodSelectionDialog();
    setImageType("backgroundImage");
  };

  const handleMobileBgFileChange = (value) => {
    if (!value) return;
    setAspectRatio(9 / 16);
    toggleMethodSelectionDialog();
    setImageType("mobileBackgroundImage");
  };

  const removeBg = () => {
    setCurrentstyles("bg", {
      ...currentStyles,
      desktopbg: "",
      unsplashImage: {
        ...currentStyles.unsplashImage,
        [PreviewTypeEnum.DESKTOP]: false,
      },
    });
    setBgFileName("");
    resetBgRef.current?.();
  };

  const removeMobileBg = () => {
    setCurrentstyles("bg", {
      ...currentStyles,
      mobilebg: "",
      unsplashImage: {
        ...currentStyles.unsplashImage,
        [PreviewTypeEnum.MOBILE]: false,
      },
    });
    setMobileBgFileName("");
    resetMobileBgRef.current?.();
  };
  const handleUploadMethod = (type: string) => {
    if (type === "unsplash") {
      toggleUnsplashDialog();
    } else {
      if (imageType === "backgroundImage") bgFileUploadBtnRef?.current?.click();
      else mobileBgFileUploadBtnRef?.current?.click();
    }
  };
  const handleUnsplashImageSave = (
    unsplashImage: string,
    imageName: string,
  ) => {
    setSelectedImage({
      url: unsplashImage,
      name: imageName,
    });
    toggleCropDialog();
  };
  const handleCropImageSave = (cropedImage) => {
    const unsplashOrNot = typeof cropedImage === "string";
    if (imageType === "backgroundImage") {
      setisFileLoading(true);
      setCurrentstyles("bg", {
        ...currentStyles,
        desktopbg: cropedImage,
        unsplashImage: {
          ...currentStyles.unsplashImage,
          [PreviewTypeEnum.DESKTOP]: unsplashOrNot,
        },
      });
      setBgFileName(cropedImage?.name);
      setisFileLoading(false);
    } else if (imageType === "mobileBackgroundImage") {
      setisFileLoading(true);
      setCurrentstyles("bg", {
        ...currentStyles,
        mobilebg: cropedImage,
        unsplashImage: {
          ...currentStyles.unsplashImage,
          [PreviewTypeEnum.MOBILE]: unsplashOrNot,
        },
      });
      setMobileBgFileName(cropedImage?.name);
      setisFileLoading(false);
    }
  };

  const [bgTab, setBgTab] = useState<BgTab>(BgTab.BGCOLOR);

  const handleColorPickerChange = useCallback(
    (valueObj) => {
      const { themeObjKey, propertyChanged, value } = valueObj;
      if (currentStyles?.styles)
        setCurrentstyles(themeObjKey, {
          ...currentStyles,
          styles: { ...currentStyles.styles, [propertyChanged]: value },
        });
    },
    [currentStyles],
  );

  return (
    <Stack align="start" w={"100%"} gap={"1.5rem"}>
      <UnsplashModal
        handleUnsplashImageSave={handleUnsplashImageSave}
        opened={openedUnsplashDialog}
        onclose={closeUnsplashDialog}
      />
      <ImageCropModal
        opened={openedCropDialog}
        onclose={closeCropDialog}
        imageName={selectedImage.name}
        handleCropImageSave={handleCropImageSave}
        image={selectedImage.url}
        aspect={aspectRatio}
      />
      <ImageUploadMethodModal
        onClose={closeMethodSelectionDialog}
        opened={openedMethodSelectionDialog}
        handleUploadMethod={handleUploadMethod}
      />
      {/* //-------------BG COLOR----------------- */}
      {/* <Divider label="Background Color" w={"100%"} variant="dashed" /> */}
      {/* <CustomColorPicker
        value={currentStyles?.styles?.backgroundColor}
        onChange={(value) =>
          setCurrentstyles("bg", {
            ...currentStyles,
            styles: { ...currentStyles.styles, backgroundColor: value },
          })
        }
      /> */}
      {/* <CustomColorInput
        value={currentStyles?.styles?.backgroundColor}
        onChange={(value) =>
          setCurrentstyles("bg", {
            ...currentStyles,
            styles: { ...currentStyles.styles, backgroundColor: value },
          })
        }
      /> */}
      <Box className={"custom-color-picker-and-heading-container"}>
        <h2>Background Color</h2>
        <CustomColorPicker
          optionalDataObj={{
            themeObjKey: "bg",
            propertyChanged: "backgroundColor",
          }}
          value={currentStyles?.styles.backgroundColor}
          onChange={handleColorPickerChange}
        />
      </Box>

      {/* //------------BGIMAGE------------ */}
      {/* <Divider label="Background Image" variant="dashed" w={"100%"} /> */}
      <Stack gap={"1rem"}>
        <h2 className={styles["section-heading"]}>Background Image</h2>
        <Group w={"100%"} justify="space-between">
          <Group gap={"xs"}>
            <ThemeIcon aria-label="Settings" bg={"var(--tertiary-color)"}>
              <IconDeviceDesktop
                style={{ width: "70%", height: "70%" }}
                stroke={1.5}
              />
            </ThemeIcon>
            <Text fw={100} c={"dark"} size="xs">
              Desktop :{" "}
            </Text>
          </Group>
          <Group>
            <Button
              leftSection={<IconUpload size={16} />}
              size="xs"
              radius="18px"
              type="button"
              onClick={handleFileChange}
              loading={isFileLoading}
              bg={"var(--tertiary-color)"}
            >
              Upload Image
            </Button>
            <ActionIcon
              color="red"
              size={"md"}
              radius={"xl"}
              onClick={removeBg}
              loading={isFileLoading}
              disabled={currentStyles?.desktopbg === ""}
            >
              <IconTrash size={15} />
            </ActionIcon>
            <FileButton
              resetRef={resetBgRef}
              onChange={(e) => {
                if (!e) return;
                handleUnsplashImageSave(URL.createObjectURL(e), e.name);
                resetBgRef?.current?.();
              }}
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
            >
              {(props) => (
                <Button ref={bgFileUploadBtnRef} display={"none"} {...props}>
                  Upload Image
                </Button>
              )}
            </FileButton>
          </Group>
        </Group>
        <Group w={"100%"} justify="space-between">
          <Group gap={"xs"}>
            <ThemeIcon aria-label="Settings" bg={"var(--tertiary-color)"}>
              <IconDeviceMobile
                style={{ width: "70%", height: "70%" }}
                stroke={1.5}
              />
            </ThemeIcon>
            <Text fw={100} c={"dark"} size="xs">
              Mobile :{" "}
            </Text>
          </Group>
          <Group>
            <Button
              leftSection={<IconUpload size={15} />}
              size="xs"
              radius="18px"
              onClick={handleMobileBgFileChange}
              loading={isFileLoading}
              bg={"var(--tertiary-color)"}
            >
              Upload Image
            </Button>
            <ActionIcon
              color="red"
              size={"md"}
              radius={"xl"}
              disabled={currentStyles?.mobilebg === ""}
              onClick={removeMobileBg}
            >
              <IconTrash size={15} />
            </ActionIcon>
            <FileButton
              resetRef={resetMobileBgRef}
              onChange={(e) => {
                if (!e) return;
                handleUnsplashImageSave(URL.createObjectURL(e), e.name);
                resetMobileBgRef?.current?.();
              }}
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
            >
              {(props) => (
                <Button
                  ref={mobileBgFileUploadBtnRef}
                  display={"none"}
                  {...props}
                >
                  Upload Image
                </Button>
              )}
            </FileButton>
          </Group>
        </Group>
      </Stack>
    </Stack>
  );
}

export default BackgroundStyles;

export function getFileName(url: string | File, isNewFile: boolean): ReactNode {
  if (isNewFile || typeof url === "string") return <>{url}</>;
  const pattern = /^[^-]+-/;
  return url.name.replace(pattern, "");
}
