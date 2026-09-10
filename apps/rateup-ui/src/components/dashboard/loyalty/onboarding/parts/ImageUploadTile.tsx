import { IconPhotoPlus, IconTrash, IconUpload } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button.tsx";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field.tsx";
import { cn } from "@/lib/utils.ts";
import { getFileUrlFromKey, uploadFile } from "@/utils/file-upload/upload.ts";

interface ImageUploadTileProps {
  id: string;
  label: string;
  hint?: string;
  /** The stored URL, or empty. */
  value: string | undefined;
  onChange: (url: string | undefined) => void;
  /** Logo tiles are square; hero tiles are wide. */
  aspect: "square" | "wide";
  accept?: string;
  invalid?: boolean;
}

/**
 * A picture-shaped upload control: the image itself is the button. The chosen file shows
 * at once from an object URL while it uploads, then the stored URL takes over. Storing the
 * URL rather than the key is deliberate — the poster and a future wallet pass read it
 * without knowing which bucket it came from.
 */
export function ImageUploadTile({
  id,
  label,
  hint,
  value,
  onChange,
  aspect,
  accept = "image/png,image/jpeg,image/webp,image/svg+xml",
  invalid,
}: Readonly<ImageUploadTileProps>) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Release the object URL when it is replaced or the tile unmounts.
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const key = await uploadFile(file);
      const url = getFileUrlFromKey(key);
      if (!url) throw new Error(t("Upload failed"));
      onChange(url);
    } catch (error) {
      setPreview(null);
      toast.error(typeof error === "string" ? error : t("Upload failed"));
    } finally {
      setUploading(false);
    }
  };

  const shown = preview ?? (value || null);

  return (
    <Field data-invalid={invalid}>
      <FieldLabel htmlFor={id} className="text-xs">
        {label}
      </FieldLabel>
      <div className={cn("flex gap-3", aspect === "square" ? "items-start" : "flex-col")}>
        <button
          type="button"
          id={id}
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          aria-label={shown ? t("Replace image") : t("Upload image")}
          className={cn(
            "group relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-muted/40 text-muted-foreground transition-colors",
            "hover:border-primary/50 hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none",
            aspect === "square" ? "size-24" : "aspect-video w-full max-w-sm",
            uploading && "cursor-wait opacity-70",
          )}
        >
          {shown ? (
            <>
              <img src={shown} alt="" className="size-full object-cover" />
              <span className="absolute inset-0 flex items-center justify-center bg-ru-blue-900/0 text-white opacity-0 transition-opacity group-hover:bg-ru-blue-900/50 group-hover:opacity-100">
                <IconUpload size={18} />
              </span>
            </>
          ) : (
            <span className="flex flex-col items-center gap-1 text-xs">
              <IconPhotoPlus size={20} />
              {t("Upload")}
            </span>
          )}
        </button>
        <div className="flex min-w-0 flex-col gap-2">
          {hint && <FieldDescription className="text-xs">{hint}</FieldDescription>}
          {shown && (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="self-start text-muted-foreground"
              onClick={() => {
                setPreview(null);
                onChange(undefined);
              }}
            >
              <IconTrash size={13} />
              {t("Remove")}
            </Button>
          )}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          void pick(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
    </Field>
  );
}
