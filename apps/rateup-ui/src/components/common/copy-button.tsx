import { IconCheck, IconCopy } from "@tabler/icons-react";
import { useEffect, useRef, useState, type ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button.tsx";
import { copyToClipboard } from "@/utils/whatsappLink.ts";

interface CopyButtonProps extends Pick<
  ComponentProps<typeof Button>,
  "variant" | "size" | "className" | "disabled"
> {
  /** What lands on the clipboard. */
  value: string;
  label: string;
  /** Shown for two seconds after a copy; defaults to "Copied". */
  copiedLabel?: string;
  /** The toast on success; defaults to the copied label. */
  toastMessage?: string;
}

/**
 * A button that copies one value — for the places a full read-only input would only add
 * noise (a link nobody needs to read, only to paste). Swaps its icon for a tick and toasts
 * so the click is acknowledged twice; says so when the clipboard is unavailable.
 */
export function CopyButton({
  value,
  label,
  copiedLabel,
  toastMessage,
  variant = "default",
  size,
  className,
  disabled,
}: Readonly<CopyButtonProps>) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const copy = async () => {
    const ok = await copyToClipboard(value);
    if (!ok) {
      toast.error(t("Could not copy"));
      return;
    }
    setCopied(true);
    toast.success(toastMessage ?? copiedLabel ?? t("Copied"));
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      disabled={disabled || !value}
      onClick={() => void copy()}
    >
      {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
      {copied ? (copiedLabel ?? t("Copied")) : label}
    </Button>
  );
}
