import React, { useEffect } from "react";

import { schemaResolver, useForm } from "@mantine/form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type z from "zod";

import {
  useCreateWaQuickReply,
  useUpdateReply,
} from "@/backend/whatsapp/inbox/quickReply/quickreply.query";
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
import { Spinner } from "@/components/ui/spinner.tsx";

import { isJSONString } from ".";
import WaTextEditor from "../waTextEditor.tsx";
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
  const form = useForm<z.infer<typeof quickReplySchema>>({
    initialValues: {
      text: "",
      category: "General",
      topic: "General Inquiry",
      key: "",
    },
    validate: schemaResolver(quickReplySchema),
  });

  useEffect(() => {
    if (reply && isEdit) {
      const { id, orgId, createdAt, ...defaultValues } = reply;
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
            <DialogTitle>
              {isEdit ? t("Edit Quick Reply") : t("Add Quick Reply")}{" "}
            </DialogTitle>
            <DialogDescription>
              {t("Click save when you are done.")}
            </DialogDescription>
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
                {form.errors.category && (
                  <FieldError>{form.errors.category}</FieldError>
                )}
              </Field>
              <Field className="flex flex-col gap-1">
                <FieldLabel htmlFor="form-rhf-demo-description">
                  {t("Topic")}
                </FieldLabel>
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
                {form.errors.topic && (
                  <FieldError>{form.errors.topic}</FieldError>
                )}
              </Field>
              <Field>
                <FieldLabel htmlFor="text">{t("Reply Text")}</FieldLabel>
                <WaTextEditor
                  handleInputChange={(value) => {
                    form.setFieldValue("text", value);
                  }}
                  content={form.values.text}
                  isQuickReplyEditor={true}
                  mah={300}
                />
                {form.errors.text && (
                  <FieldError>{form.errors.text}</FieldError>
                )}
              </Field>
            </FieldGroup>
          </div>

          <DialogFooter className="mt-2 mr-4">
            <DialogClose asChild>
              <Button variant="secondary">
                <span className="text-sm" onClick={() => form.reset()}>
                  {t("Cancel")}
                </span>
              </Button>
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
