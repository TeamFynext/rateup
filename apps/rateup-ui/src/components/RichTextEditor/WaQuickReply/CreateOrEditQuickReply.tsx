import { EditorContent } from "@tiptap/react";
import { TypeOutline } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type z from "zod";

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
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { TooltipProvider } from "@/components/ui/tooltip.tsx";
import { useBridgedForm } from "@/hooks/useBridgedForm";

import { isJSONString } from ".";
import InsertEmoji from "../InsertEmoji/index.tsx";
import { WaTextCharacterCount } from "../wa-editor/character-count.tsx";
import { useWaEditor } from "../wa-editor/use-wa-editor.ts";
import { quickReplySchema } from "./WaQuickReplySettings.tsx";

const CreateOrEditQuickReply = ({
  isEdit = false,
  reply,
  open,
  setOpen,
}: {
  isEdit?: boolean;
  reply?: any;
  open: boolean;
  setOpen: (open: boolean) => void;
}) => {
  const { t } = useTranslation();
  const update = useUpdateReply();
  const create = useCreateWaQuickReply();
  const form = useBridgedForm<z.infer<typeof quickReplySchema>>({
    defaultValues: {
      text: "",
      category: "General",
      topic: "General Inquiry",
      key: "",
    },
    schema: quickReplySchema,
  });
  const textEditor = useWaEditor({
    content: form.values.text,
    onChange: (value) => form.setFieldValue("text", value),
  });

  useEffect(() => {
    if (reply && isEdit) {
      const { ...defaultValues } = reply;
      const initialValues = {
        ...defaultValues,
        key: defaultValues.key || "",
        text: !isJSONString(defaultValues.text)
          ? defaultValues.text
          : JSON.parse(defaultValues.text),
      };
      form.setValues(initialValues);
    }
  }, [reply]);

  function onSubmit() {
    if (form.validate().hasErrors) return;
    if (isEdit) {
      update.mutate(
        {
          id: reply.id,
          data: {
            ...form.values,
            text: JSON.stringify(form.values.text),
          },
        },
        {
          onSuccess: () => {
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
    create.mutate(
      {
        ...form.values,
        text: JSON.stringify(form.values.text),
      },
      {
        onSuccess: () => {
          setOpen(false);
          toast.success("Quick reply added successfully");
        },
        onSettled: () => {
          form.reset();
        },
        onError: (error) => {
          toast.error(error?.message || "Error in adding quick reply");
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <form>
        <DialogContent className="sm:max-w-md md:max-w-3xl md:min-w-2xl min-h-[500px]">
          <DialogHeader>
            <DialogTitle>{isEdit ? t("Edit Quick Reply") : t("Add Quick Reply")} </DialogTitle>
            <DialogDescription>{t("Click save when you are done.")}</DialogDescription>
          </DialogHeader>
          <div className="overflow-auto h-[500px]">
            <FieldGroup className="flex flex-col gap-4 p-1">
              <Field className="flex flex-col gap-1">
                <FieldLabel htmlFor="key" className="text-sm font-normal">
                  {t("Key")}
                </FieldLabel>
                <Input
                  {...form.getInputProps("key")}
                  id="key"
                  placeholder="Enter key"
                  className="placeholder:text-sm"
                />
                <FieldDescription className="text-xs">
                  {t(
                    "Use a clear, unique key (letters, numbers, or underscores) that represents this reply text for quick lookup",
                  )}
                </FieldDescription>
                {form.errors.key && <FieldError>{form.errors.key}</FieldError>}
              </Field>
              <Field className="flex flex-col gap-1">
                <FieldLabel htmlFor="category">{t("Category")}</FieldLabel>
                <Input
                  {...form.getInputProps("category")}
                  id="category"
                  placeholder="Enter category"
                  autoComplete="off"
                  className="placeholder:text-sm text-sm"
                />
                <FieldDescription className="text-xs">
                  {t(
                    "Choose a high-level category to organize this reply text, Examples: 'Billing', 'Technical', or 'Account'",
                  )}
                </FieldDescription>
                {form.errors.category && <FieldError>{form.errors.category}</FieldError>}
              </Field>
              <Field className="flex flex-col gap-1">
                <FieldLabel htmlFor="form-rhf-demo-description">{t("Topic")}</FieldLabel>
                <Input
                  {...form.getInputProps("topic")}
                  id="topic"
                  placeholder="Enter topic"
                  autoComplete="off"
                />
                <FieldDescription className="text-xs">
                  {t(
                    "Choose a clear topic that describes the customer issue or task this reply text addresses for easy reference",
                  )}
                </FieldDescription>
                {form.errors.topic && <FieldError>{form.errors.topic}</FieldError>}
              </Field>
              <Field>
                <FieldLabel htmlFor="text">{t("Reply Text")}</FieldLabel>
                <div className="flex-1">
                  <ToolbarProvider editor={textEditor}>
                    <TooltipProvider>
                      <EditorContent
                        editor={textEditor}
                        style={{
                          backgroundColor: "var(--accent)",
                          borderRadius: "5px",
                          maxHeight: "300px",
                          minHeight: "120px",
                        }}
                        className="overflow-y-auto rounded-xl"
                      />
                      <div className="flex items-center justify-end space-x-1 px-2 pt-1">
                        <WaTextCharacterCount editor={textEditor} max={1024} />
                      </div>
                      <div className="flex flex-wrap p-2">
                        <div className="mt-1 flex items-center">
                          <InsertEmoji editor={textEditor} />
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
                {form.errors.text && <FieldError>{form.errors.text}</FieldError>}
              </Field>
            </FieldGroup>
          </div>

          <DialogFooter className="mt-2 mr-4">
            <DialogClose render={<Button variant="secondary" />}>
              <span className="text-sm" onClick={() => form.reset()}>
                {t("Cancel")}
              </span>
            </DialogClose>
            <Button type="submit" onClick={onSubmit} size="sm">
              {update.isPending || create.isPending ? <Spinner /> : null}
              <span className="text-sm">{t("Save Changes")}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </form>
    </Dialog>
  );
};

export default CreateOrEditQuickReply;
