import { Box, Button, Group } from "@mantine/core";
import styles from "./SaveChangesBtn.module.css";
import { useLandingPageObj } from "../../../LandingPageContext/LandingPageContext";
import { useThemeDispatch, useThemeObj } from "../../ThemeContext/ThemeContext";
import { initialState as defaultThemeobj } from "../../ThemeContext/constants";
import loadash from "lodash";
import { useCallback, useState } from "react";
import { uploadFile } from "./uploadFile";
import { produce } from "immer";
import { useUpdateLandingPageMutation } from "../../../../../../backend/landingPage/landingPage.query";
import { useRouter } from "next/router";

function SaveChangesBtn() {
  // Theme obj from api.
  const { theme } = useLandingPageObj();
  // Theme obj from reducer which we are making changes locally.
  const currentThemeObj = useThemeObj();

  const themeDispatch = useThemeDispatch();

  const {
    query: { shortUrlId },
  } = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  const { mutateAsync } = useUpdateLandingPageMutation(shortUrlId);

  let haveUnsavedChanges = false;
  if (theme) {
    haveUnsavedChanges = !loadash.isEqual(theme, currentThemeObj);
  } else {
    haveUnsavedChanges = !loadash.isEqual(defaultThemeobj, currentThemeObj);
  }

  const handleSavingLandingPageChanges = useCallback(async () => {
    setIsSaving(true);
    const {
      background: { desktopBgImgFile, mobileBgImgFile },
      logo: { logoFile },
    } = currentThemeObj;

    const filesArray = [
      { prop: "desktopBgImgUrl", file: desktopBgImgFile },
      { prop: "mobileBgImgUrl", file: mobileBgImgFile },
      { prop: "logoUrl", file: logoFile },
    ];
    const promisesArray = [];
    filesArray.forEach(({ prop, file }) => {
      if (file instanceof File) promisesArray.push(uploadFile(prop, file));
    });

    try {
      const newBgImgValues = await Promise.all(promisesArray);
      const newLandingPageTheme = produce(currentThemeObj, (draft) => {
        newBgImgValues.forEach(({ prop, url }) => {
          switch (prop) {
            case "desktopBgImgUrl": {
              draft["background"]["desktopBgImgUrl"] = url;
              delete draft["background"]["desktopBgImgFile"];
              break;
            }
            case "mobileBgImgUrl": {
              draft["background"]["mobileBgImgUrl"] = url;
              delete draft["background"]["mobileBgImgFile"];
              break;
            }
            case "logoUrl": {
              draft["logo"]["logoUrl"] = url;
              delete draft["logo"]["logoFile"];
              break;
            }
          }
        });
      });
      const { theme } = await mutateAsync({
        shortUrlId,
        theme: newLandingPageTheme,
      });
      themeDispatch({
        type: "update-theme",
        payload: theme,
      });
      setIsSaving(false);
    } catch (err) {
      setIsSaving(false);
    }
  }, [currentThemeObj]);

  return (
    <Group>
      <p style={{ color: haveUnsavedChanges ? "red" : "green", fontSize: 14 }}>
        {haveUnsavedChanges ? "Unsaved Changes" : "All Changes are saved"}
      </p>
      <Button
        className={styles["save-btn"]}
        loading={isSaving}
        onClick={handleSavingLandingPageChanges}
      >
        Save
      </Button>
    </Group>
  );
}

export default SaveChangesBtn;
