import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { type PublicOrder, requestPublicReturn } from "@/backend/commerce/shop.api";
import { Button } from "@/components/ui/button.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { getApiErrorMessage } from "@/utils/apiError.ts";

import { QuantityStepper } from "../shared.tsx";

interface Props {
  token: string;
  order: PublicOrder;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSent: () => void;
}

export function ReturnDialog({ token, order, open, onOpenChange, onSent }: Readonly<Props>) {
  const { t } = useTranslation();
  // Item id → quantity being returned; absent means not returned.
  const [picked, setPicked] = useState<Record<string, number>>({});
  const [reason, setReason] = useState("");
  const items = Object.entries(picked).map(([orderItemId, quantity]) => ({
    orderItemId,
    quantity,
  }));

  const submit = useMutation({
    mutationFn: () => requestPublicReturn(token, { reason: reason.trim(), items }),
    onSuccess: onSent,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">{t("Request a return")}</DialogTitle>
          <DialogDescription>
            {t("Choose what you're sending back. We'll reply with the next steps.")}
          </DialogDescription>
        </DialogHeader>

        <ul className="flex flex-col gap-2">
          {order.items.map((item) => {
            const quantity = picked[item.id];
            return (
              <li
                key={item.id}
                className="flex items-center gap-3 rounded-xl border border-border p-3"
              >
                <Checkbox
                  aria-label={item.title}
                  checked={quantity !== undefined}
                  onCheckedChange={(checked) =>
                    setPicked((current) => {
                      const next = { ...current };
                      if (checked) next[item.id] = item.quantity;
                      else delete next[item.id];
                      return next;
                    })
                  }
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{item.title}</span>
                  {item.variantTitle && item.variantTitle !== "Default" && (
                    <span className="block truncate text-xs text-muted-foreground">
                      {item.variantTitle}
                    </span>
                  )}
                </span>
                {quantity !== undefined && item.quantity > 1 && (
                  <QuantityStepper
                    size="sm"
                    value={quantity}
                    max={item.quantity}
                    label={item.title}
                    onChange={(value) => setPicked((current) => ({ ...current, [item.id]: value }))}
                  />
                )}
              </li>
            );
          })}
        </ul>

        <label className="flex flex-col gap-1.5 text-sm font-medium">
          {t("Why are you returning it?")}
          <Textarea
            value={reason}
            maxLength={300}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t("For example: wrong size, arrived damaged")}
          />
        </label>

        {submit.isError && (
          <p className="text-sm text-destructive" role="alert">
            {getApiErrorMessage(submit.error, t("Couldn't send your request. Try again."))}
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("Cancel")}
          </Button>
          <Button
            loading={submit.isPending}
            disabled={!items.length || !reason.trim()}
            onClick={() => submit.mutate()}
          >
            {t("Send request")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
