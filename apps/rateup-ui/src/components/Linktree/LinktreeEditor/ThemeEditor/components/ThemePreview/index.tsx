import { useCallback, useRef } from "react";
import type { ChangeEvent, CSSProperties } from "react";

import type { LinktreeLink } from "@/components/Linktree/LinktreeEditor/LinksEditor/components/LinkCard.tsx";
import { useLinktreeObj } from "@/components/Linktree/LinktreeEditor/LinktreeContext/LinktreeContext.tsx";
import { Textarea } from "@/components/ui/textarea";

import { imagesPath } from "../../../../../HomePage/constants.tsx";
import PreviewDeviceSelector from "../../../../../Survey/SurveyTheme/components/PreviewDeviceSelector/index.tsx";
import {
  useSelectedPreviewDevice,
  useSetSelectedPreviewDevice,
  useThemeDispatch,
  useThemeObj,
} from "../../ThemeContext/ThemeContext.tsx";
import UnsplashCreditText from "../UnsplashCreditText/index.tsx";

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

  const handleTitleTextChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    themeDispatch({
      type: "title-text-change",
      payload: e.target.value,
    });
  }, []);

  const handleSubtitleTextChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    themeDispatch({
      type: "subtitle-text-change",
      payload: e.target.value,
    });
  }, []);

  let backgroundImageUrl = "";
  const backgroundImageObj: CSSProperties = {};
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
    <div className={styles["theme-preview-container"]}>
      <PreviewDeviceSelector
        value={selectedPreviewDevice}
        onChange={setSelectedPreviewDevice}
        withLabel={false}
        className={styles["preview-device-selector"]}
      />

      <div
        className={`${styles["preview-div"]} ${selectedPreviewDevice === "mobile" ? styles["preview-div-mobile"] : ""}`}
        style={backgroundStylesObj}
        ref={previewDivRef}
      >
        {!links.length ? (
          <div className="flex size-full items-center justify-center">
            <p>
              <span>Add Links</span>
              <span> to view the preview</span>
            </p>
          </div>
        ) : (
          <>
            <div className={styles["logo-img-container"]}>
              {logoUrl ? (
                <img src={logoUrl} alt="logo" style={{ ...logoStyles, objectFit: "contain" }} />
              ) : (
                <img
                  src={`${imagesPath}/camera-off.svg`}
                  alt="logo"
                  style={{ ...logoStyles, objectFit: "contain" }}
                />
              )}
            </div>

            <div className={styles["title-textarea-div-container"]}>
              <Textarea
                className={styles["title-textarea-div"]}
                style={titleStyles}
                value={titleText}
                onChange={handleTitleTextChange}
              />
            </div>

            <div className={styles["subtitle-textarea-div-container"]}>
              <Textarea
                className={styles["subtitle-textarea-div"]}
                style={subtitleStyles}
                value={subtitleText}
                onChange={handleSubtitleTextChange}
              />
            </div>

            <div className={styles["links-list-container"]}>
              {links.map(({ id, linkDisplayName, linkUrl }: LinktreeLink) => {
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
            </div>
          </>
        )}

        <UnsplashCreditText url={backgroundImageUrl} />
      </div>
    </div>
  );
}

export default ThemePreview;
