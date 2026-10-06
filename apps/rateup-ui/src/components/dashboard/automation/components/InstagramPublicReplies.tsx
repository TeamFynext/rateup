import { IconPlus, IconX } from "@tabler/icons-react";
import { Controller, useFormContext } from "react-hook-form";

import { Button } from "@/components/ui/button.tsx";
import { Field, FieldDescription, FieldError, FieldTitle } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";

import type { CreateRuleInput } from "./schema.ts";

/** Mirrors the API's cap in wa_rule.schema.ts. */
const MAX_REPLIES = 10;

export function InstagramPublicReplies() {
  const { control } = useFormContext<CreateRuleInput>();

  return (
    <Controller
      control={control}
      name="options.instagramPublicReplies"
      render={({ field, fieldState }) => {
        const replies = field.value ?? [];
        const setReply = (index: number, text: string) =>
          field.onChange(replies.map((reply, i) => (i === index ? text : reply)));

        return (
          <Field data-invalid={fieldState.invalid} className="rounded-xl border bg-muted/20 p-4">
            <FieldTitle>Reply in public (optional)</FieldTitle>
            <FieldDescription>
              Posted under the comment so others see you answered. One is picked at random each
              time, so add a few.
            </FieldDescription>
            <div className="space-y-2">
              {replies.map((reply, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={reply}
                    onChange={(event) => setReply(index, event.target.value)}
                    placeholder="Sent you a DM 📩"
                    maxLength={2200}
                    aria-label={`Public reply ${index + 1}`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove public reply ${index + 1}`}
                    onClick={() => field.onChange(replies.filter((_, i) => i !== index))}
                  >
                    <IconX className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
            {replies.length < MAX_REPLIES && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="self-start"
                onClick={() => field.onChange([...replies, ""])}
              >
                <IconPlus className="mr-1.5 size-4" />
                {replies.length ? "Add a variation" : "Add a public reply"}
              </Button>
            )}
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        );
      }}
    />
  );
}
