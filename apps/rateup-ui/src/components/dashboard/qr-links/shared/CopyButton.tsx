import { IconCheck, IconCopy } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button.tsx";
import { copyToClipboard } from "@/utils/whatsappLink.ts";

export function CopyButton({
  value,
  label,
  disabled,
}: Readonly<{ value: string; label: string; disabled?: boolean }>) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!(await copyToClipboard(value))) {
      toast.error(t("Could not copy. Select the link and copy it yourself."));
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={copied ? t("Copied") : label}
      disabled={disabled}
      onClick={() => void copy()}
    >
      {copied ? <IconCheck /> : <IconCopy />}
    </Button>
  );
}
