import { Button } from "@rateup/ui/components/button";
import { Field, FieldDescription, FieldError, FieldTitle } from "@rateup/ui/components/field";
import { Input } from "@rateup/ui/components/input";
import { IconCheck, IconCopy, IconQrcode } from "@tabler/icons-react";
import { useState } from "react";
import { Controller, useFormContext, useWatch } from "react-hook-form";

import { downloadIgMeQr } from "@/components/dashboard/instagram/igMeQr.ts";
import { mMeLink } from "@/components/dashboard/messenger/mMeLink.ts";

import type { CreateRuleInput } from "./schema.ts";

/** The ?ref= an "m.me link opened" rule answers, with the link it produces. */
export function MessengerLinkRef() {
  const { control } = useFormContext<CreateRuleInput>();
  // A Messenger rule's channel id is the Page id, which is what m.me takes.
  const [pageId] = useWatch({ control, name: "whatsappSettingsPhoneIds" }) ?? [];
  const ref = useWatch({ control, name: "options.messengerRef" }) ?? "";
  const link = mMeLink(pageId, ref);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    globalThis.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-3 bg-card ring-foreground/10 rounded-xl p-4 ring-1">
      <Controller
        control={control}
        name="options.messengerRef"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldTitle>Link name</FieldTitle>
            <Input
              value={field.value ?? ""}
              onChange={field.onChange}
              placeholder="summer_sale"
              maxLength={2083}
            />
            <FieldDescription>
              Becomes the link's <code>?ref=</code>. Leave it empty to answer every m.me link to
              this Page.
            </FieldDescription>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <div className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2">
        <span className="min-w-0 flex-1 truncate font-mono text-sm">
          {link || <span className="text-muted-foreground">Pick a Page to see the link</span>}
        </span>
        <Button type="button" variant="ghost" size="sm" onClick={copy} disabled={!link}>
          {copied ? <IconCheck className="size-4" /> : <IconCopy className="size-4" />}
          <span className="sr-only">Copy link</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={!link}
          onClick={() => void downloadIgMeQr(link, ref || pageId || "link", "m-me")}
        >
          <IconQrcode className="size-4" />
          <span className="sr-only">Download QR code</span>
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Someone already chatting with your Page starts this rule the moment they open the link.
        Someone new starts it when they tap Get Started.
      </p>
    </div>
  );
}
