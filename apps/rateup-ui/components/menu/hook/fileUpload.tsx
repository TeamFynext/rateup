"use client";

import { useEffect, useState } from "react";

import { uploadFile } from "../../../utils/file-upload/upload";
import { showErrorToast } from "../../../utils/notifications";

export const useFileUpload = (file: File | null, field: string, form: any) => {
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!file) return;

    setIsUploading(true);
    uploadFile(file)
      .then((key) => {
        form.setFieldValue(field, key);
        setIsUploading(false);
      })
      .catch((err) => {
        showErrorToast(`Error uploading ${field}. Please try again.`);
        setIsUploading(false);
      });
  }, [file]);

  return { isUploading };
};
