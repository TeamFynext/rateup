import { zodResolver } from "@hookform/resolvers/zod";
import { IconTypography } from "@tabler/icons-react";
import { EditorContent } from "@tiptap/react";
import { useEffect, useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type z from "zod";

import type { QuickReply } from "@/backend/whatsapp/inbox/quickReply/quickreply.api";
import {
  useCreateWaQuickReply,
  useUpdateReply,
} from "@/backend/whatsapp/inbox/quickReply/quickreply.query";
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
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover.tsx";
import { TooltipProvider } from "@/components/ui/tooltip.tsx";
import { deleteUploadedFiles } from "@/utils/file-upload/upload.ts";

import { isJSONString } from ".";
import InsertEmoji from "../InsertEmoji/index.tsx";
import { WaTextCharacterCount } from "../wa-editor/character-count.tsx";
import { useWaEditor } from "../wa-editor/use-wa-editor.ts";
import QuickReplyMediaField from "./QuickReplyMediaField.tsx";
import { quickReplySchema } from "./WaQuickReplySettings.tsx";

const CreateOrEditQuickReply = ({
  isEdit = false,
  reply,
  open,
  setOpen,
}: {
  isEdit?: boolean;
  reply?: QuickReply | null;
  open: boolean;
  setOpen: (open: boolean) => void;
}) => {
  const { t } = useTranslation();
  const update = useUpdateReply();
  const create = useCreateWaQuickReply();
  type QuickReplyValues = z.infer<typeof quickReplySchema>;
  const form = useForm<QuickReplyValues>({
    resolver: zodResolver(quickReplySchema),
    defaultValues: {
      text: "",
      topic: "General Inquiry",
      key: "",
      media: [],
    },
  });
  // Files uploaded since the dialog opened. Until a save hands them to the reply they
  // are nobody's, so closing without saving deletes them.
  const unsavedUploads = useRef(new Set<string>());
  function discardUnsavedUploads() {
    const keys = [...unsavedUploads.current];
    unsavedUploads.current.clear();
    if (keys.length) void deleteUploadedFiles({ fileKeyArray: keys.map((Key) => ({ Key })) });
  }
  function close() {
    discardUnsavedUploads();
    form.reset();
    setOpen(false);
  }
  const textEditor = useWaEditor({
    content: form.getValues("text"),
    onChange: (value) => form.setValue("text", value, { shouldDirty: true, shouldValidate: true }),
  });

  useEffect(() => {
    if (reply && isEdit) {
      const { ...defaultValues } = reply;
      const initialValues = {
        ...defaultValues,
        key: defaultValues.key || "",
        media: defaultValues.media ?? [],
        text: !isJSONString(defaultValues.text)
          ? defaultValues.text
          : JSON.parse(defaultValues.text),
      };
      form.reset(initialValues);
    }
  }, [reply, isEdit, form]);

  const onSubmit = form.handleSubmit((values) => {
    if (textEditor?.isEmpty && values.media.length === 0) {
      form.setError("text", { message: t("Add a message or an attachment") });
      return;
    }
    const payload = { ...values, text: textEditor?.isEmpty ? "" : JSON.stringify(values.text) };
    const saved = () => unsavedUploads.current.clear();
    if (isEdit) {
      update.mutate(
        { id: reply?.id ?? "", data: payload },
        {
          onSuccess: () => {
            saved();
            toast.success("Quick reply Updated");
            setOpen(false);
          },
          onSettled: () => {
            form.reset();
          },
          onError: (error) => {
            toast.error(error?.message || "Updation failed");
          },
        },
      );
      return;
    }
    create.mutate(payload, {
      onSuccess: () => {
        saved();
        setOpen(false);
        toast.success("Quick reply added successfully");
      },
      onSettled: () => {
        form.reset();
      },
      onError: (error) => {
        toast.error(error?.message || "Error in adding quick reply");
      },
    });
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setOpen(true);
        else close();
      }}
    >
      <DialogContent className="flex max-h-[90vh] flex-col gap-4 sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("Edit quick reply") : t("Add quick reply")}</DialogTitle>
          <DialogDescription>
            {t("Type / and its key in the inbox composer to use it.")}
          </DialogDescription>
        </DialogHeader>

        {/* Scrolls only when the screen is too short; the footer stays put. */}
        <form
          id="quick-reply-form"
          onSubmit={onSubmit}
          className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1"
        >
          <FieldGroup className="gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Controller
                name="key"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="quick-reply-key">{t("Key")}</FieldLabel>
                    <Input
                      {...field}
                      id="quick-reply-key"
                      placeholder="welcome"
                      autoComplete="off"
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <Controller
                name="topic"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="quick-reply-topic">{t("Topic")}</FieldLabel>
                    <Input
                      {...field}
                      id="quick-reply-topic"
                      placeholder={t("e.g. Pricing")}
                      autoComplete="off"
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </div>

            <Controller
              name="text"
              control={form.control}
              // The tiptap editor owns this value; only the error state is read here.
              render={({ fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>{t("Message")}</FieldLabel>
                  <div className="overflow-hidden rounded-lg border border-border bg-accent">
                    <ToolbarProvider editor={textEditor!}>
                      <TooltipProvider>
                        <EditorContent
                          editor={textEditor}
                          className="max-h-48 overflow-y-auto [&_.ProseMirror]:min-h-24 [&_.ProseMirror]:px-3 [&_.ProseMirror]:py-2 [&_.ProseMirror]:outline-none"
                        />
                        <div className="flex items-center gap-0.5 border-t border-border px-1.5 py-1">
                          <InsertEmoji editor={textEditor} />
                          <Popover>
                            <PopoverTrigger
                              render={
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-sm"
                                  aria-label={t("Format")}
                                />
                              }
                            >
                              <IconTypography />
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-1">
                              <div className="flex items-center gap-0.5">
                                <BoldToolbar />
                                <ItalicToolbar />
                                <StrikeThroughToolbar />
                                <CodeToolbar />
                                <BlockquoteToolbar />
                                <BulletListToolbar />
                                <OrderedListToolbar />
                              </div>
                            </PopoverContent>
                          </Popover>
                          <UndoToolbar />
                          <RedoToolbar />
                          <span className="ms-auto">
                            <WaTextCharacterCount editor={textEditor} max={1024} />
                          </span>
                        </div>
                      </TooltipProvider>
                    </ToolbarProvider>
                  </div>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Controller
              name="media"
              control={form.control}
              render={({ field }) => (
                <Field>
                  <FieldLabel>{t("Attachments")}</FieldLabel>
                  <QuickReplyMediaField
                    value={field.value}
                    onChange={field.onChange}
                    onUploaded={(key) => unsavedUploads.current.add(key)}
                    onRemoveUnsaved={(key) => {
                      if (!unsavedUploads.current.delete(key)) return;
                      void deleteUploadedFiles({ fileKeyArray: [{ Key: key }] });
                    }}
                  />
                </Field>
              )}
            />
          </FieldGroup>
        </form>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>{t("Cancel")}</DialogClose>
          <Button
            type="submit"
            form="quick-reply-form"
            loading={update.isPending || create.isPending}
          >
            {isEdit ? t("Save") : t("Add quick reply")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateOrEditQuickReply;
