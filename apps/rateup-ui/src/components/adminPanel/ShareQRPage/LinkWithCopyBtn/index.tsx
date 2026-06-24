import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";

interface LinkWithCopyBtnProps {
  link: string;
  label?: string;
}

function LinkWithCopyBtn({ link, label }: Readonly<LinkWithCopyBtnProps>) {
  const { t: translations } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex flex-col">
      {label && <Label className="text-sm font-medium text-muted-foreground mb-1">{label}</Label>}
      <div className="flex gap-2">
        <Input value={link} readOnly className="flex-1" />
        <Button
          type="button"
          variant={copied ? "outline" : "default"}
          onClick={handleCopy}
          size="icon"
          aria-label={copied ? translations("Copied url") : translations("Copy url")}
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}

export default LinkWithCopyBtn;
