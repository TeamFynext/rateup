import { IconX } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button.tsx";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";

/** The API requires a reason to reject, and whoever asked will read it. */
export function RejectReasonPopover({
  onReject,
  disabled,
}: Readonly<{ onReject: (reason: string) => void; disabled?: boolean }>) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            size="sm"
            variant="outline"
            className="text-destructive hover:text-destructive"
            disabled={disabled}
          />
        }
      >
        <IconX size={14} />
        {t("Reject")}
      </PopoverTrigger>
      <PopoverContent className="flex w-72 flex-col gap-2" align="end">
        <p className="text-sm font-medium text-foreground">{t("Why is this being rejected?")}</p>
        <Textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder={t("A note for whoever asked")}
          rows={3}
          autoFocus
        />
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
            {t("Cancel")}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={reason.trim().length === 0}
            onClick={() => {
              onReject(reason.trim());
              setReason("");
              setOpen(false);
            }}
          >
            {t("Reject")}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
