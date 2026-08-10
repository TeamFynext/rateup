import { IconLoader2 } from "@tabler/icons-react";
import type { JSONContent } from "@tiptap/react";
import { Controller, type UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { z } from "zod";

import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Field, FieldDescription, FieldError } from "@/components/ui/field.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";

import { DEFAULT_JOIN_MESSAGE_TEXT } from "./constants.ts";
import type { BasicSettingsSchema } from "./schemas.ts";

const MAX_LENGTH = 1024;

interface ReferralMessageSettingsProps {
  form: UseFormReturn<z.infer<typeof BasicSettingsSchema>>;
  onSave: (data: z.infer<typeof BasicSettingsSchema>) => void;
  isPending: boolean;
  disabled?: boolean;
}

export function ReferralMessageSettings({
  form,
  onSave,
  isPending,
  disabled = false,
}: Readonly<ReferralMessageSettingsProps>) {
  const { t } = useTranslation();
  const plainTextMessage = getPlainText(form.watch("referralMessageTemplate"));
  const previewWithSamples = replacePreviewVariables(plainTextMessage);
  const hasContactNameVariable = plainTextMessage.includes("{{1}}");
  const hasReferralCodeVariable = plainTextMessage.includes("{{2}}");

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle className="text-base">{t("Join Program Message")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <form onSubmit={form.handleSubmit(onSave)} className="space-y-3">
          <Controller
            control={form.control}
            name="referralMessageTemplate"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldDescription className="text-xs">
                  {t("Use variables")}: {"{{1}}"} {t("for contact name")},{"{{2}}"}{" "}
                  {t("for referral code")}. {t("Both are required and each can be used only once.")}
                </FieldDescription>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (!hasContactNameVariable && !disabled) {
                        const current = getPlainText(form.getValues("referralMessageTemplate"));
                        form.setValue("referralMessageTemplate", current + "{{1}}", {
                          shouldDirty: true,
                        });
                      }
                    }}
                    disabled={hasContactNameVariable || disabled}
                  >
                    {t(`Insert '{{1}}'`)}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (!hasReferralCodeVariable && !disabled) {
                        const current = getPlainText(form.getValues("referralMessageTemplate"));
                        form.setValue("referralMessageTemplate", current + "{{2}}", {
                          shouldDirty: true,
                        });
                      }
                    }}
                    disabled={hasReferralCodeVariable || disabled}
                  >
                    {t("Insert '{{2}}'")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (!disabled) {
                        form.setValue("referralMessageTemplate", DEFAULT_JOIN_MESSAGE_TEXT, {
                          shouldDirty: true,
                        });
                      }
                    }}
                    disabled={disabled}
                  >
                    {t("Reset to Default")}
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Textarea
                      value={plainTextMessage}
                      onChange={(event) => field.onChange(event.target.value)}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                      maxLength={MAX_LENGTH}
                      rows={8}
                      disabled={disabled}
                      aria-invalid={fieldState.invalid}
                      className="min-h-37.5 max-h-62.5 resize-y bg-accent"
                    />
                    <p className="text-right text-xs text-muted-foreground">
                      {plainTextMessage.length}/{MAX_LENGTH}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">{t("Preview")}</p>
                    <div className="rounded-md border bg-muted/20 p-3 text-sm whitespace-pre-wrap">
                      {previewWithSamples}
                      <div className="text-blue-400">https://wa.me/referral?code=REF-4GB8</div>
                    </div>
                  </div>
                </div>

                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Button size="sm" className="w-[50%] mt-2" type="submit" disabled={isPending || disabled}>
            {isPending ? (
              <>
                <IconLoader2 className="w-4 h-4 mr-2 animate-spin" />
                {t("Saving")}
              </>
            ) : (
              t("Save Changes")
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function getPlainText(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") {
    const parsed = tryParseJson(value);
    if (parsed !== null) {
      return getPlainText(parsed);
    }

    return value;
  }

  const nodeToText = (node: unknown): string => {
    if (!node || typeof node !== "object") return "";
    const { type, text, content: children } = node as JSONContent;

    if (type === "text") {
      return text || "";
    }

    if (type === "hardBreak") {
      return "\n";
    }

    if (Array.isArray(children)) {
      const nestedText = children.map(nodeToText).join("");

      if (type === "paragraph") {
        return `${nestedText}\n`;
      }

      return nestedText;
    }

    return "";
  };

  // Handle TipTap JSON structure - could be array or object with content
  const content = Array.isArray(value)
    ? value
    : typeof value === "object" && value !== null
      ? (value as JSONContent).content
      : undefined;

  if (Array.isArray(content)) {
    return content.map(nodeToText).join("").trimEnd();
  }

  return "";
}

function tryParseJson(value: string) {
  const trimmed = value.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
    return null;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

function replacePreviewVariables(value: string) {
  return value.replace("{{1}}", "Alex Johnson").replace("{{2}}", "REF-4GB8");
}
