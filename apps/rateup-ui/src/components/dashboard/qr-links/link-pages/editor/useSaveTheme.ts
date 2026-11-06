import { produce } from "immer";
import type { Dispatch } from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import type { LinktreeTheme } from "@/backend/linktree/linktree.api.ts";
import { useUpdateLinktreeMutation } from "@/backend/linktree/linktree.query";
import { uploadToCdn } from "@/utils/file-upload/upload.ts";

import type { ThemeAction } from "../theme.ts";

/** Uploads any images picked since the last save, then saves the theme with their URLs. */
export function useSaveTheme(shortUrlId: string, dispatch: Dispatch<ThemeAction>) {
  const { t } = useTranslation();
  const { mutateAsync } = useUpdateLinktreeMutation(shortUrlId);
  const [saving, setSaving] = useState(false);

  const save = async (theme: LinktreeTheme) => {
    setSaving(true);
    try {
      const { background, logo } = theme;
      const [desktop, mobile, logoUrl] = await Promise.all(
        [background.desktopBgImgFile, background.mobileBgImgFile, logo.logoFile].map((file) =>
          file instanceof File ? uploadToCdn(file) : Promise.resolve(undefined),
        ),
      );
      if (desktop === null || mobile === null || logoUrl === null) {
        toast.error(t("An image didn't upload, so nothing was saved. Try again."));
        return;
      }
      const next = produce(theme, (draft) => {
        if (desktop) draft.background.desktopBgImgUrl = desktop;
        if (mobile) draft.background.mobileBgImgUrl = mobile;
        if (logoUrl) draft.logo.logoUrl = logoUrl;
        delete draft.background.desktopBgImgFile;
        delete draft.background.mobileBgImgFile;
        delete draft.logo.logoFile;
      });
      const updated = await mutateAsync({ shortUrlId, theme: next });
      dispatch({ type: "replace", theme: updated.theme ?? next });
    } catch {
      // The mutation's own toast has already said so.
    } finally {
      setSaving(false);
    }
  };

  return { save, saving };
}
