import type { Content, JSONContent } from "@tiptap/react";
import { EditorContent } from "@tiptap/react";
import { Loader2 } from "lucide-react";
import { TypeOutline } from "lucide-react";
import { Controller, type UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { z } from "zod";

import InsertEmoji from "@/components/RichTextEditor/InsertEmoji/index.tsx";
import { WaTextCharacterCount } from "@/components/RichTextEditor/wa-editor/character-count.tsx";
import { useWaEditor } from "@/components/RichTextEditor/wa-editor/use-wa-editor.ts";
import { BlockquoteToolbar } from "@/components/tiptap/toolbars/blockquote.tsx";
import { BoldToolbar } from "@/components/tiptap/toolbars/bold.tsx";
import { BulletListToolbar } from "@/components/tiptap/toolbars/bullet-list.tsx";
import { CodeToolbar } from "@/components/tiptap/toolbars/code.tsx";
import { ItalicToolbar } from "@/components/tiptap/toolbars/italic.tsx";
import { OrderedListToolbar } from "@/components/tiptap/toolbars/ordered-list.tsx";
import { RedoToolbar } from "@/components/tiptap/toolbars/redo.tsx";
import { StrikeThroughToolbar } from "@/components/tiptap/toolbars/strikethrough.tsx";
import { ToolbarProvider } from "@/components/tiptap/toolbars/toolbar-provider.tsx";
import { UndoToolbar } from "@/components/tiptap/toolbars/undo.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Field, FieldDescription, FieldError } from "@/components/ui/field.tsx";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover.tsx";
import { TooltipProvider } from "@/components/ui/tooltip.tsx";

import { DEFAULT_JOIN_MESSAGE_TEMPLATE } from "./constants.ts";
import type { BasicSettingsSchema } from "./schemas.ts";

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
  const referralMessageTemplate = form.watch("referralMessageTemplate");
  const normalizedTemplate = normalizeTemplateValue(
    referralMessageTemplate || DEFAULT_JOIN_MESSAGE_TEMPLATE,
  );
  const editorContent = toEditorContent(normalizedTemplate);
  const referralEditor = useWaEditor({
    content: editorContent,
    onChange: (value) => {
      if (!disabled) form.setValue("referralMessageTemplate", value);
    },
  });
  const plainTextMessage = getPlainText(editorContent);
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
            render={({ fieldState }) => (
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
                        form.setValue("referralMessageTemplate", DEFAULT_JOIN_MESSAGE_TEMPLATE, {
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
                  <div className="flex-1">
                    <ToolbarProvider editor={referralEditor!}>
                      <TooltipProvider>
                        <EditorContent
                          editor={referralEditor}
                          style={{
                            backgroundColor: "var(--accent)",
                            borderRadius: "5px",
                            maxHeight: "250px",
                            minHeight: "150px",
                          }}
                          className="overflow-y-auto rounded-xl"
                        />
                        <div className="flex items-center justify-end space-x-1 px-2 pt-1">
                          <WaTextCharacterCount editor={referralEditor} max={1024} />
                        </div>
                        <div className="flex flex-wrap p-2">
                          <div className="mt-1 flex items-center">
                            <InsertEmoji editor={referralEditor} />
                          </div>
                          <Popover>
                            <PopoverTrigger>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                title="Format"
                              >
                                <TypeOutline className="h-5 w-5" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-full">
                              <div className="flex flex-nowrap gap-1">
                                <div className="flex items-center">
                                  <BoldToolbar />
                                  <ItalicToolbar />
                                  <StrikeThroughToolbar />
                                  <CodeToolbar />
                                </div>
                                <div className="flex items-center">
                                  <BlockquoteToolbar />
                                  <BulletListToolbar />
                                  <OrderedListToolbar />
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                          <div className="flex items-center">
                            <UndoToolbar />
                            <RedoToolbar />
                          </div>
                        </div>
                      </TooltipProvider>
                    </ToolbarProvider>
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
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
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

function normalizeTemplateValue(value: unknown) {
  if (typeof value !== "string") return value;

  const parsed = tryParseJson(value);
  if (parsed === null) {
    return value;
  }

  return parsed;
}

function toEditorContent(value: unknown): Content {
  if (!value) return "";

  if (Array.isArray(value)) {
    return {
      type: "doc",
      content: value,
    };
  }

  if (typeof value === "object") {
    const doc = value as JSONContent;
    if (doc.type === "doc" && Array.isArray(doc.content)) {
      return doc;
    }

    if (Array.isArray(doc.content)) {
      return {
        type: "doc",
        content: doc.content,
      };
    }
  }

  return typeof value === "string" ? value : null;
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
