import { IconX } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { useContext, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { CurrentResponsesContext } from "@/context/ResponseContext.ts";
import { useSurveyThemeData } from "@/context/SurveyThemeContext.tsx";
import { uploadFile } from "@/utils/file-upload/upload.ts";

function getFileName(url: string | File, isNewFile: boolean): ReactNode {
  if (isNewFile || typeof url === "string") return <>{url}</>;
  const pattern = /^[^-]+-/;
  return url.name.replace(pattern, "");
}

export function ImageForm({ isPreview }: { isPreview?: boolean }) {
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(isPreview ? null : response || null);
  const [isUploading, setIsUploading] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const surveyThemeObj = useSurveyThemeData();
  const pickedFileTextColor = surveyThemeObj?.surveyTheme?.title?.styles?.color;
  const { t: translations } = useTranslation();

  useEffect(() => {
    const uploadAndUpdate = async () => {
      if (file) {
        setIsUploading(true);
        const fileKey = await uploadFile(file);
        setIsUploading(false);
        updateResponse(fileKey);
      }
    };
    uploadAndUpdate();
  }, [file]);

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [file]);

  function removeImg() {
    setFile(null);
    if (inputRef.current) inputRef.current.value = "";
    setPreviewUrl(null);
    updateResponse(null);
  }

  const isImageSelected = previewUrl || response?.length > 0;

  return (
    <div className="flex w-full flex-col gap-4">
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="w-full max-w-[300px] rounded-lg"
        onClick={() => inputRef.current?.click()}
      >
        {translations("Upload image")}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/svg+xml,image/webp,.heic"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) setFile(f);
        }}
      />

      {isImageSelected && (
        <div className="relative max-w-[300px]">
          <Button
            type="button"
            variant="secondary"
            size="icon-sm"
            className="absolute right-0 top-0 z-10 rounded-full"
            onClick={removeImg}
          >
            <IconX className="size-3.5" stroke={1.5} />
          </Button>

          <div className="flex flex-col items-center gap-2">
            <div className="relative size-[150px]">
              {isUploading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-sm bg-white/60 backdrop-blur-sm">
                  <Spinner />
                </div>
              )}
              <img
                src={previewUrl || `${import.meta.env.VITE_AWS_CLOUDFRONT_URL}${response}`}
                alt="Preview"
                className="size-full object-contain"
              />
            </div>

            <p className="text-center text-sm" style={{ color: pickedFileTextColor }}>
              {translations("Picked file:")}{" "}
              {file?.name || getFileName(response, isPreview || false)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
