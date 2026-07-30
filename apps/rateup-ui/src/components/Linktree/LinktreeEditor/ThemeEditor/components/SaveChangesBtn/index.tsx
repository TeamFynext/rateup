import { useParams } from "@tanstack/react-router";
import { produce } from "immer";
import { isEqual } from "lodash";
import { useCallback, useState } from "react";

import { useUpdateLinktreeMutation } from "@/backend/linktree/linktree.query";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

import { useLinktreeObj } from "../../../LinktreeContext/LinktreeContext.tsx";
import { initialState as defaultThemeobj } from "../../ThemeContext/constants.ts";
import { useThemeDispatch, useThemeObj } from "../../ThemeContext/ThemeContext.tsx";
import type { LinktreeTheme } from "../../ThemeContext/ThemeReducer.tsx";
import { uploadFile } from "./uploadFile.tsx";

import styles from "./SaveChangesBtn.module.css";

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
    const promisesArray: Array<Promise<string>> = [];
    filesArray.forEach(({ prop, file }) => {
      if (file instanceof File) promisesArray.push(uploadFile(prop, file));
    });

    try {
      const newBgImgValues = await Promise.all(promisesArray);
      const newLinktreeTheme = produce(currentThemeObj, (draft: LinktreeTheme) => {
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
    } catch {
      setIsSaving(false);
    }
  }, [currentThemeObj]);

  return (
    <div className="flex items-center gap-2">
      <p style={{ color: haveUnsavedChanges ? "red" : "green", fontSize: 14 }}>
        {haveUnsavedChanges ? "Unsaved Changes" : "All Changes are saved"}
      </p>
      <Button
        className={styles["save-btn"]}
        disabled={isSaving}
        onClick={handleSavingLinktreeChanges}
      >
        {isSaving && <Spinner data-icon="inline-start" />}
        Save
      </Button>
    </div>
  );
}

export default SaveChangesBtn;
