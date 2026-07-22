import { IconFileFilled, IconUpload, IconX } from "@tabler/icons-react";
import { useContext, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button.tsx";
import { Card } from "@/components/ui/card.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { CurrentResponsesContext } from "@/context/ResponseContext.ts";
import { cn } from "@/lib/utils";
import { deleteUploadedFiles, getFileNameFromKey, uploadFile } from "@/utils/file-upload/upload.ts";

import { luminance } from "./isLightColor.ts";
import { useThemePrimaryColor } from "./useThemePrimaryColor.ts";

const MAX_FILE_SIZE = 10 * 1024 ** 2;

interface FileInputFormProps {
  isPreview?: boolean;
}

const FileInputForm = ({ isPreview }: FileInputFormProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [error, setError] = useState("");
  const [isDragActive, setIsDragActive] = useState(false);
  const { t: translations } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const themePrimaryColor = useThemePrimaryColor();
  const dragFileTextColor =
    luminance(themePrimaryColor) > 0.8 ? "var(--foreground)" : themePrimaryColor;

  const { response, updateResponse } = useContext(CurrentResponsesContext);
  const handleUploadedFiles = async () => {
    try {
      if (!file) return;
      setError("");
      const prevResponse = response;
      if (prevResponse) updateResponse(null);
      setIsUploading(true);
      if (prevResponse?.length) {
        await deleteUploadedFiles({
          fileKeyArray: [{ Key: prevResponse }],
        });
      }
      const fileKey = await uploadFile(file, false, { allowAll: true });
      updateResponse(fileKey);
      setIsUploading(false);
    } catch (e) {
      console.log(e);
      setIsUploading(false);
      updateResponse(null);
      setError("Error in uploading file");
    }
  };

  useEffect(() => {
    handleUploadedFiles();
  }, [file]);

  const handleRemoveFile = async (filekey) => {
    setIsRemoving(true);
    await deleteUploadedFiles({
      fileKeyArray: [{ Key: filekey }],
    });
    setFile(null);
    updateResponse(null);
    setIsRemoving(false);
  };

  const validateAndSetFile = (selected: File) => {
    if (selected.size > MAX_FILE_SIZE) {
      setError(translations("File should not exceed 10mb"));
      return;
    }
    setFile(selected);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(false);
    if (isPreview) return;
    const dropped = e.dataTransfer.files[0];
    if (dropped) validateAndSetFile(dropped);
  };

  return (
    <div className="flex flex-col gap-4">
      <div
        onClick={() => !isPreview && fileInputRef.current?.click()}
        onDragEnter={(e) => {
          e.preventDefault();
          if (!isPreview) setIsDragActive(true);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={(e) => {
          e.preventDefault();
          setIsDragActive(false);
        }}
        onDrop={handleDrop}
        style={{ borderColor: themePrimaryColor }}
        className={cn(
          "relative flex min-h-20 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition-colors",
          isDragActive && "bg-muted/50",
          isPreview && "pointer-events-none cursor-not-allowed opacity-60",
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const selected = e.target.files?.[0];
            if (selected) validateAndSetFile(selected);
          }}
        />
        {isDragActive ? (
          <IconUpload stroke={1.5} style={{ color: themePrimaryColor }} />
        ) : (
          <IconFileFilled stroke={1.5} size={"2.5rem"} className="text-muted-foreground" />
        )}
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/60">
            <Spinner />
          </div>
        )}
        <div>
          <p className="text-base" style={{ color: dragFileTextColor }}>
            {translations("Drag file here or click to select file")}
          </p>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {translations("File should not exceed 10mb")}
          </p>
        </div>
      </div>
      {error && <p className="text-destructive">{error}</p>}
      {response && !isPreview ? (
        <Card className="border p-4" style={{ borderColor: themePrimaryColor }}>
          <div className="flex items-center justify-between">
            <span>{file?.name || getFileNameFromKey(response)}</span>
            {isRemoving ? (
              <Spinner className="size-4" />
            ) : (
              <Button
                onClick={() => handleRemoveFile(response)}
                variant="secondary"
                size="icon"
                className="rounded-full"
              >
                <IconX stroke={1.5} />
              </Button>
            )}
          </div>
        </Card>
      ) : null}
    </div>
  );
};

export default FileInputForm;
