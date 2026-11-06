import { IconArrowLeft, IconGift } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { CustomerReward } from "@/backend/loyalty/cashier/cashier.api";
import { Button } from "@/components/ui/button.tsx";
import { Field, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { cn } from "@/lib/utils.ts";

interface GrantGiftFormProps {
  customerName: string;
  gifts: CustomerReward[];
  isSaving: boolean;
  onBack: () => void;
  onGrant: (reward: CustomerReward, note: string) => void;
}

/** A free gift is handed to a named customer with a code; the catalogue entry lives in Program. */
export function GrantGiftForm({
  customerName,
  gifts,
  isSaving,
  onBack,
  onGrant,
}: Readonly<GrantGiftFormProps>) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<CustomerReward | null>(null);
  const [note, setNote] = useState("");

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <Button type="button" variant="ghost" size="icon" onClick={onBack} aria-label={t("Back")}>
          <IconArrowLeft size={18} />
        </Button>
        <div>
          <p className="text-xs text-muted-foreground">{customerName}</p>
          <h2 className="text-base font-semibold text-foreground">{t("Grant a gift")}</h2>
        </div>
      </div>

      {gifts.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t("No free gifts are set up. Add one under Program › Rewards.")}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {gifts.map((gift) => (
            <li key={gift.id}>
              <button
                type="button"
                onClick={() => setSelected(gift)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg border p-3 text-left",
                  selected?.id === gift.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted",
                )}
              >
                <IconGift size={18} className="shrink-0 text-muted-foreground" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-foreground">
                    {gift.name}
                  </span>
                  {gift.description && (
                    <span className="block truncate text-xs text-muted-foreground">
                      {gift.description}
                    </span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Field>
        <FieldLabel htmlFor="gift-note">{t("Note (optional)")}</FieldLabel>
        <Input
          id="gift-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder={t("Service recovery, birthday…")}
        />
      </Field>

      <Button
        className="h-12"
        disabled={!selected || isSaving}
        onClick={() => selected && onGrant(selected, note)}
      >
        {isSaving
          ? t("Granting…")
          : selected
            ? t("Give {gift}", { gift: selected.name })
            : t("Give a gift")}
      </Button>
    </div>
  );
}
