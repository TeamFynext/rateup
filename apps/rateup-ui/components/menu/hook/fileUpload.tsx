"use client";

import { useEffect, useState } from "react";

import { toast } from "sonner";

import { uploadFile } from "../../../utils/file-upload/upload";

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
        toast.error(`Error uploading ${field}. Please try again.`);
        setIsUploading(false);
      });
  }, [file]);

  return { isUploading };
};
