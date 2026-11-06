import { Button } from "@rateup/ui/components/button";
import { IconCopy, IconPhotoPlus } from "@tabler/icons-react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { resolveAssetUrl, uploadFile } from "@/utils/file-upload/upload.ts";

export function CopyButton({
  value,
  label,
  className,
}: Readonly<{ value: string; label: string; className?: string }>) {
  const { t } = useTranslation();
  return (
    <Button
      type="button"
      size="icon-sm"
      variant="outline"
      aria-label={label}
      className={className}
      onClick={() => {
        void navigator.clipboard.writeText(value);
        toast.success(t("Copied"));
      }}
    >
      <IconCopy />
    </Button>
  );
}

/** Read-only text with a copy button beside it, for URLs and event names to paste elsewhere. */
export function CopyField({ value, label }: Readonly<{ value: string; label: string }>) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <code className="min-w-0 flex-1 truncate rounded-md border border-border bg-background px-2.5 py-1.5 font-mono text-xs">
        {value}
      </code>
      <CopyButton value={value} label={label} />
    </span>
  );
}

export function ImagePicker({
  url,
  onChange,
  label,
  wide,
}: Readonly<{ url: string; onChange: (url: string) => void; label: string; wide?: boolean }>) {
  const { t } = useTranslation();
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const pick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      onChange(resolveAssetUrl(await uploadFile(file)));
    } catch (e) {
      toast.error(typeof e === "string" ? e : t("Could not upload the image"));
    } finally {
      setBusy(false);
    }
  };
  const box = wide ? "h-16 w-32" : "size-16";
  return (
    <div className="flex items-center gap-3">
      {url ? (
        <img src={url} alt="" className={cn(box, "rounded-lg border border-border object-cover")} />
      ) : (
        <span
          className={cn(
            box,
            "flex items-center justify-center rounded-lg bg-muted text-muted-foreground",
          )}
        >
          <IconPhotoPlus aria-hidden />
        </span>
      )}
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          loading={busy}
          onClick={() => ref.current?.click()}
        >
          {url ? t("Replace") : label}
        </Button>
        {url && (
          <Button type="button" size="sm" variant="ghost" onClick={() => onChange("")}>
            {t("Remove")}
          </Button>
        )}
      </div>
      <input
        ref={ref}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          void pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
