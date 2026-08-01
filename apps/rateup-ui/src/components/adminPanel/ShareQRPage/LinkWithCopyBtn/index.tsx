import { IconCheck, IconCopy } from "@tabler/icons-react";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button.tsx";
import { FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";

interface LinkWithCopyBtnProps {
  link: string;
  label?: string;
}

function LinkWithCopyBtn({ link, label }: Readonly<LinkWithCopyBtnProps>) {
  const uid = useId();
  const { t: translations } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex flex-col">
      {label && (
        <FieldLabel
          htmlFor={`${uid}-field`}
          className="text-sm font-medium text-muted-foreground mb-1"
        >
          {label}
        </FieldLabel>
      )}
      <div className="flex gap-2">
        <Input id={`${uid}-field`} value={link} readOnly className="flex-1" />
        <Button
          type="button"
          variant={copied ? "outline" : "default"}
          onClick={handleCopy}
          size="icon"
          aria-label={copied ? translations("Copied url") : translations("Copy url")}
        >
          {copied ? <IconCheck className="w-4 h-4" /> : <IconCopy className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}

export default LinkWithCopyBtn;
