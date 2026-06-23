"use client";

import { useCallback, useState } from "react";

import { Button, Group } from "@mantine/core";
import { useParams } from "@tanstack/react-router";
import { produce } from "immer";
import { isEqual } from "lodash";

import { useUpdateLinktreeMutation } from "@/backend/linktree/linktree.query";

import { useLinktreeObj } from "../../../LinktreeContext/LinktreeContext.tsx";
import { initialState as defaultThemeobj } from "../../ThemeContext/constants.ts";
import {
  useThemeDispatch,
  useThemeObj,
} from "../../ThemeContext/ThemeContext.tsx";
import styles from "./SaveChangesBtn.module.css";
import { uploadFile } from "./uploadFile.tsx";

function SaveChangesBtn() {
  // Theme obj from api.
  const { theme } = useLinktreeObj();
  // Theme obj from reducer which we are making changes locally.
  const currentThemeObj = useThemeObj();

  const themeDispatch = useThemeDispatch();

  const params = useParams({
    strict: false,
  });
  const shortUrlId = params?.shortUrlId as string;
  const [isSaving, setIsSaving] = useState(false);

  const { mutateAsync } = useUpdateLinktreeMutation(shortUrlId);

  let haveUnsavedChanges = false;
  if (theme) {
    haveUnsavedChanges = !isEqual(theme, currentThemeObj);
  } else {
    haveUnsavedChanges = !isEqual(defaultThemeobj, currentThemeObj);
  }

  const handleSavingLinktreeChanges = useCallback(async () => {
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
      const newLinktreeTheme = produce(currentThemeObj, (draft) => {
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
        theme: newLinktreeTheme,
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
        onClick={handleSavingLinktreeChanges}
      >
        Save
      </Button>
    </Group>
  );
}

export default SaveChangesBtn;
