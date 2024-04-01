import { Box, Image, Textarea } from "@mantine/core";
import styles from "./ThemePreview.module.css";
import PreviewDeviceSelector from "../../../../../Survey/SurveyTheme/components/PreviewDeviceSelector";
import {
  useSelectedPreviewDevice,
  useSetSelectedPreviewDevice,
  useThemeDispatch,
  useThemeObj,
} from "../../ThemeContext/ThemeContext";
import { imagesPath } from "../../../../../HomePage/constants";
import { useCallback, useEffect, useRef, useState } from "react";
import { IconChevronRight } from "@tabler/icons-react";
import UnsplashCreditText from "../UnsplashCreditText";

function ThemePreview() {
  const selectedPreviewDevice = useSelectedPreviewDevice();
  const setSelectedPreviewDevice = useSetSelectedPreviewDevice();
  const {
    background: { styles: backgroundStyles, desktopBgImgUrl, mobileBgImgUrl },
    logo: { styles: logoStyles, logoUrl },
    title: { styles: titleStyles, text: titleText },
    subtitle: { styles: subtitleStyles, text: subtitleText },
    linkListItem: { styles: linkListItemStyles },
  } = useThemeObj();

  const themeDispatch = useThemeDispatch();

  const previewDivRef = useRef(null);

  const handleTitleTextChange = useCallback((e) => {
    themeDispatch({
      type: "title-text-change",
      payload: e.target.value,
    });
  }, []);

  const handleSubtitleTextChange = useCallback((e) => {
    themeDispatch({
      type: "subtitle-text-change",
      payload: e.target.value,
    });
  }, []);

  let backgroundImageUrl = "";
  const backgroundImageObj = {};
  if (selectedPreviewDevice === "desktop") {
    if (desktopBgImgUrl) backgroundImageUrl = desktopBgImgUrl;
    backgroundImageObj["backgroundImage"] = `url(${desktopBgImgUrl})`;
  } else if (selectedPreviewDevice === "mobile") {
    if (mobileBgImgUrl) backgroundImageUrl = mobileBgImgUrl;
    backgroundImageObj["backgroundImage"] = `url(${mobileBgImgUrl})`;
  }
  const backgroundStylesObj = {
    ...backgroundStyles,
    ...backgroundImageObj,
  };

  return (
    <Box className={styles["theme-preview-container"]}>
      <PreviewDeviceSelector
        value={selectedPreviewDevice}
        onChange={setSelectedPreviewDevice}
        withLabel={false}
        className={styles["preview-device-selector"]}
      />

      <Box
        className={`${styles["preview-div"]} ${selectedPreviewDevice === "mobile" ? styles["preview-div-mobile"] : ""}`}
        style={backgroundStylesObj}
        ref={previewDivRef}
      >
        <Box className={styles["logo-img-container"]}>
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt="logo"
              style={{ ...logoStyles, objectFit: "contain" }}
            />
          ) : (
            <Image
              src={`${imagesPath}/camera-off.svg`}
              alt="logo"
              style={{ ...logoStyles, objectFit: "contain" }}
            />
          )}
        </Box>

        <Box className={styles["title-textarea-div-container"]}>
          <Textarea
            className={styles["title-textarea-div"]}
            style={titleStyles}
            value={titleText}
            onChange={handleTitleTextChange}
            autosize
            styles={{
              input: titleStyles,
            }}
          />
        </Box>

        <Box className={styles["subtitle-textarea-div-container"]}>
          <Textarea
            className={styles["subtitle-textarea-div"]}
            style={titleStyles}
            value={subtitleText}
            onChange={handleSubtitleTextChange}
            autosize
            styles={{
              input: subtitleStyles,
            }}
          />
        </Box>

        <Box className={styles["links-list-container"]}>
          {Array(3)
            .fill(3)
            .map((ele, i) => {
              return (
                <a
                  key={i}
                  className={styles["link-list-item"]}
                  style={linkListItemStyles}
                >
                  <span>This is Link{i + 1} Title</span>
                </a>
              );
            })}
        </Box>

        <UnsplashCreditText url={backgroundImageUrl} />
      </Box>
    </Box>
  );
}

export default ThemePreview;
