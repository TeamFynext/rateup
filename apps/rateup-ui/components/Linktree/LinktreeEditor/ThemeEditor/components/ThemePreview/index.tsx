"use client";

import { useCallback, useRef } from "react";

import { Box, Center, Image, Textarea } from "@mantine/core";

import { useLinktreeObj } from "@/components/Linktree/LinktreeEditor/LinktreeContext/LinktreeContext";

import { imagesPath } from "../../../../../HomePage/constants";
import PreviewDeviceSelector from "../../../../../Survey/SurveyTheme/components/PreviewDeviceSelector";
import {
  useSelectedPreviewDevice,
  useSetSelectedPreviewDevice,
  useThemeDispatch,
  useThemeObj,
} from "../../ThemeContext/ThemeContext";
import UnsplashCreditText from "../UnsplashCreditText";
import styles from "./ThemePreview.module.css";

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

  const linktreeObj = useLinktreeObj();
  const links = linktreeObj?.links || [];

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
        {!links.length ? (
          <Center h={"100%"} w={"100%"}>
            <p>
              <span>Add Links</span>
              <span> to view the preview</span>
            </p>
          </Center>
        ) : (
          <>
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
              {links.map(({ id, linkDisplayName, linkUrl }) => {
                return (
                  <a
                    target="_blank"
                    key={id}
                    className={styles["link-list-item"]}
                    style={linkListItemStyles}
                    href={linkUrl}
                  >
                    <span>{linkDisplayName}</span>
                  </a>
                );
              })}
            </Box>
          </>
        )}

        <UnsplashCreditText url={backgroundImageUrl} />
      </Box>
    </Box>
  );
}

export default ThemePreview;
