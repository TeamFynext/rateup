import { useEffect } from "react";

import { useForm } from "@mantine/form";
import { CheckCircle2, UserPlus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { isValidPhoneNumber } from "react-phone-number-input";
import { toast } from "sonner";

import { ContactGroupType } from "@/types/enums.ts";
import {
  useCreateContactMutation,
  useEditContactMutation,
} from "@/backend/campaign/contacts/contacts.query";
import { useCustomFieldsContext } from "@/context/CustomFieldsContext.tsx";
import { importMethod } from "@/utils/enums/index.ts";

import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar.tsx";
import { Button } from "../ui/button.tsx";
import { Checkbox } from "../ui/checkbox.tsx";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog.tsx";
import { Label } from "../ui/label.tsx";
import { Spinner } from "../ui/spinner.tsx";
import { getInitials } from "../ui/utils.ts";
import ContactForm from "./ContactForm.tsx";
import { getSourceBadge } from "./utils/utils.tsx";

const CreateOrEditContactModal = ({
  opened,
  setOpened,
  initialValues,
  type = ContactGroupType.NORMAL,
  createNewContactMutation,
}: {
  opened: boolean;
  setOpened: (value) => void;
  initialValues?: any;
  type?: ContactGroupType;
  createNewContactMutation?: any;
}) => {
  const { t } = useTranslation();
  const { customFields = [] } = useCustomFieldsContext();
  const createContactMutation = useCreateContactMutation();
  const editContactMutation = useEditContactMutation();
  const form = useForm({
    initialValues: initialValues ?? {
      name: "",
      phone: "",
      email: "",
      dob: null,
      source: importMethod.MANUAL,
      contactType: customFields?.map((field) => field.slug) || [],
      countryCode: "91",
      customFields: [],
      updateExisting: false,
      external_id: "",
      labels: [],
      contactGroupIds: [],
      assignedUserIds: [],
      lifecycleId: "",
      notes: "",
    },
    validate: {
      phone: (value, values) => {
        if (values.source == importMethod.MANUAL)
          return !value
            ? t("Phone Number cannot be blank")
            : !isValidPhoneNumber(value)
              ? t("Invalid phone number")
              : null;
      },
      name: (value, values) =>
        values.source == importMethod.MANUAL &&
        (value.length ? null : t("Name cannot be blank")),
      customFields: {
        "*": (value, values, path) => {
          const fieldId = path.split(".")[1];
          const customField = customFields.find(
            (field) => field.slug === fieldId,
          );

          if (!customField) return null;

          if (value && customField.type === "email") {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
              return t("Invalid email format.");
            }
          }

          if (value && customField.type === "number") {
            if (isNaN(Number(value))) {
              return t("Must be a valid number");
            }
          }

          return null;
        },
      },
    },
  });
  const handleSubmit = async () => {
    const validation = form.validate();
    if (validation.hasErrors) {
      return;
    }
    const contactData = {
      ...form.getValues(),
      dob: form.getValues()?.dob
        ? new Date(form.getValues().dob).toISOString()
        : null,
      external_id: form.getValues()?.external_id || undefined,
      phone: form.getValues()?.phone?.replace(/^\+/, "") || "",
      source:
        type === ContactGroupType.LOYALTY
          ? ContactGroupType.LOYALTY
          : form.getValues().source,
      lastReceivedMessageTimeStamp: undefined,
    };
    if (initialValues) {
      editContactMutation.mutate(
        { data: contactData, contactId: initialValues.id },
        {
          onSuccess: () => {
            setOpened(false);
            form.reset();
            toast.success("contact updated successfully");
          },
          onError: (error) => {
            toast.error(error?.message || "Error in updating contact");
          },
        },
      );
    } else {
      if (createNewContactMutation) {
        createNewContactMutation.mutate([contactData], {
          onSuccess: () => {
            setOpened(false);
            form.reset();
            toast.success("contact added successfully");
          },
        });
      } else {
        createContactMutation.mutate(contactData, {
          onSuccess: () => {
            setOpened(false);
            form.reset();
            toast.success("contact added successfully");
          },
          onError: (error) => {
            toast.error(error?.message || "Error in adding contact");
          },
        });
      }
    }
  };

  useEffect(() => {
    if (initialValues) {
      form.setValues(initialValues);
      form.setFieldValue("phone", "+" + initialValues.phone);
    }
  }, [initialValues]);
  useEffect(() => {
    form.setInitialValues({
      ...form.values,
      contactType: customFields?.map((field) => field.slug) || [],
    });
    form.setFieldValue(
      "contactType",
      customFields?.map((field) => field.slug) || [],
    );
  }, [customFields]);
  return (
    <Dialog open={opened} onOpenChange={setOpened}>
      <DialogContent className="min-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {!initialValues && (
              <div className="w-8 h-8 rounded-lg bg-linear-to-br from-rateup-blue to-blue-600 flex items-center justify-center">
                <UserPlus className="w-4 h-4 text-white" />
              </div>
            )}
            {initialValues ? t("Edit Contact") : t("Add Contact")}
          </DialogTitle>
          <DialogDescription>
            {initialValues
              ? t("Update contact information and preferences")
              : t("Fill the details and click save.")}
          </DialogDescription>
        </DialogHeader>
        {initialValues && (
          <div className="flex items-center gap-3 pb-3 border-b">
            <Avatar className="w-16 h-16">
              <AvatarImage src={initialValues.profilePic} />
              <AvatarFallback className="bg-linear-to-br from-rateup-blue to-blue-600 text-white">
                {getInitials(initialValues.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-medium">{initialValues.name}</p>
              <div className="flex items-center gap-2 mt-1">
                {getSourceBadge(initialValues.source)}
              </div>
            </div>
          </div>
        )}
        <div className="space-y-4 max-h-[400px] overflow-y-auto p-1">
          {customFields?.length > 0 && (
            <div className="border flex self-end gap-1 p-1 w-fit">
              {customFields.map((field) => (
                <div
                  className="flex items-center gap-1 rounded-lg p-1 w-fit px-2"
                  key={field.id}
                >
                  <Checkbox
                    checked={form.values.contactType?.includes(field?.slug)}
                    id={field.slug}
                    className="rounded-xl"
                    onCheckedChange={(checked) => {
                      form.setFieldValue(
                        "contactType",
                        checked
                          ? [...form.values.contactType, field.slug]
                          : form.values.contactType.filter(
                              (slug) => field.slug !== slug,
                            ),
                      );
                    }}
                  />
                  <Label htmlFor={field.slug} className="text-sm font-normal">
                    {field.name}
                  </Label>
                </div>
              ))}
            </div>
          )}
          <ContactForm form={form} customFields={customFields} type={type} />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary" onClick={() => form.reset()}>
              <span className="text-sm font-normal">{t("Cancel")}</span>
            </Button>
          </DialogClose>
          <Button onClick={handleSubmit}>
            {createContactMutation.isPending ||
            createNewContactMutation?.isPending ||
            editContactMutation.isPending ? (
              <Spinner />
            ) : (
              <CheckCircle2 className="w-4 h-4 mr-2" />
            )}
            <span className="text-sm font-normal">{t("Save")}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateOrEditContactModal;
