import { RotateCcwIcon, Trash2Icon, UploadIcon } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";
import { DEFAULT_IMAGE_BASE64_START } from "@/utils/constants.ts";
import { getFileUrlFromKey } from "@/utils/file-upload/upload.ts";

const RESET_SIZE = {
  xs: "icon-xs",
  sm: "icon-sm",
  md: "icon",
  lg: "icon-lg",
} as const;

export interface FileUploadButtonProps {
  /** Parent-held ref; call `resetRef.current()` to clear the native input. */
  resetRef?: React.RefObject<(() => void) | null>;
  handleFileChange: (file: File) => Promise<void> | void;
  clearFile: () => void;
  fileSrc?: string | { id: string; image: string };
  fileButton?: React.ComponentProps<typeof Button>;
  resetButton?: React.ComponentProps<typeof Button>;
  type?: "file" | "image";
  accept?: string;
  error?: string;
  style?: React.CSSProperties;
  className?: string;
  size?: keyof typeof RESET_SIZE;
  rightSection?: React.ReactNode;
}

/** shadcn replacement for the former Mantine-based `RateupFileUploadButton`. */
export function FileUploadButton({
  resetRef,
  handleFileChange,
  clearFile,
  fileSrc,
  fileButton,
  resetButton,
  type = "image",
  accept = "image/png,image/jpeg,image/gif,image/webp",
  error,
  style,
  className,
  size = "lg",
  rightSection,
}: Readonly<FileUploadButtonProps>) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (resetRef) {
      resetRef.current = () => {
        if (inputRef.current) inputRef.current.value = "";
      };
    }
  }, [resetRef]);

  const url = rightSection
    ? typeof fileSrc === "string"
      ? getFileUrlFromKey(fileSrc)
      : `${DEFAULT_IMAGE_BASE64_START}${fileSrc}`
    : typeof fileSrc === "object"
      ? getFileUrlFromKey(fileSrc.image)
      : `${DEFAULT_IMAGE_BASE64_START}${fileSrc}`;

  return (
    <div className={cn("flex items-center gap-1", className)} style={style}>
      {fileSrc && (
        <HoverCard>
          <HoverCardTrigger
            render={<img src={url} alt="img" className="h-8.75 w-auto rounded-sm object-cover" />}
          />
          <HoverCardContent className="w-auto p-2">
            <img src={url} alt="choice-preview" className="max-h-100 w-auto" />
          </HoverCardContent>
        </HoverCard>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileChange(file);
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-invalid={!!error}
        className="grow"
        onClick={() => inputRef.current?.click()}
        {...fileButton}
      >
        {error || (fileSrc ? "Replace" : `Select ${type}`)}
        <UploadIcon />
      </Button>
      <Button
        type="button"
        variant="outline"
        size={RESET_SIZE[size]}
        disabled={!fileSrc}
        onClick={clearFile}
        className="text-destructive"
        {...resetButton}
      >
        {fileSrc ? <Trash2Icon /> : <RotateCcwIcon />}
      </Button>
      {rightSection}
    </div>
  );
}
