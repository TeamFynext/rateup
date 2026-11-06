import { Button } from "@rateup/ui/components/button";
import { IconCheck, IconCopy } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function ApiCopyButton({ value }: Readonly<{ value: string }>) {
  const [copied, setCopied] = useState(false);
  const { t: translations } = useTranslation();

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={handleCopy}
        aria-label={copied ? translations("Copied") : translations("Copy")}
        title={translations("Copy")}
      >
        {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
      </Button>
      {/* The copied state is otherwise icon-only, so announce it. */}
      <span role="status" aria-live="polite" className="sr-only">
        {copied ? translations("Copied") : ""}
      </span>
    </>
  );
}
