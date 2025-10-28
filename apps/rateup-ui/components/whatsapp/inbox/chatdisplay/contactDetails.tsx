"use client";

import { useEffect, useState } from "react";

import { NumberInput, Paper, Select, Stack, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import {
  IconBrandWhatsapp,
  IconClock,
  IconUser,
  IconX,
} from "@tabler/icons-react";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  Bot,
  ChevronRight,
  Clock,
  Copy,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Save,
  Shield,
  Tag,
  Trash2,
  TruckElectric,
  User,
  UserCheck,
  X,
  Zap,
} from "lucide-react";
import { zod4Resolver } from "mantine-form-zod-resolver";
import { useTranslations } from "next-intl";
import { isValidPhoneNumber } from "react-phone-number-input";
import { z } from "zod/v4";

import { useContactsStore } from "@/app/dashboard/inbox/store";
import {
  useContactDeleteMutation,
  useEditContactMutation,
} from "@/backend/campaign/contacts/contacts.query";
import { LifecycleInput } from "@/components/Contacts/LifecycleSelector";
import PhoneInputWithCountry from "@/components/input/PhoneInputWithCountry";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreativeAvatar } from "@/components/ui/creative-avatar";
import CustomTooltip from "@/components/ui/custom/CustomTooltip";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCustomFieldsContext } from "@/context/CustomFieldsContext";

interface WaInboxContactDetailsProps {
  contact: any;
  groupId: string;
  isOpen: boolean;
  setIsOpen: (value: boolean) => void;
}

const contactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().refine((phone) => {
    if (!phone) return false;
    return isValidPhoneNumber(phone);
  }, "Please enter a valid phone number"),
  email: z.email("Invalid email").optional().or(z.literal("")),
  other: z.string().optional(),
  lifecycleId: z.string().optional(),
  customFields: z
    .array(
      z.object({
        id: z.string().optional(),
        fieldId: z.string(),
        value: z.string(),
      }),
    )
    .optional(),
});

type ContactFormValues = z.infer<typeof contactSchema>;

export default function WaInboxContactDetails({
  contact,
  groupId,
  isOpen,
  setIsOpen,
}: WaInboxContactDetailsProps) {
  const editContactMutation = useEditContactMutation(null);
  const { customFields } = useCustomFieldsContext();
  const { updateContactById, setSelectedContact } = useContactsStore();
  const deleteContactMutation = useContactDeleteMutation(groupId);
  const [editable, setEditable] = useState(false);
  const form = useForm<ContactFormValues>({
    validate: zod4Resolver(contactSchema),
    initialValues: {
      name: contact?.name || "",
      phone: "+" + contact?.phone || "",
      email: contact?.email || "",
      other: contact?.other || "",
      lifecycleId: contact?.lifecycleId || "",
      customFields: contact?.customFields || [],
    },
  });

  const t = useTranslations();

  useEffect(() => {
    form.setValues({
      name: contact?.name || "",
      phone: "+" + contact?.phone || "",
      email: contact?.email || "",
      other: contact?.other || "",
      lifecycleId: contact?.lifecycleId || "",
      customFields: contact?.customFields || [],
    });
  }, [contact]);

  const handleSubmit = async (values: ContactFormValues) => {
    let data = {
      ...values,
      phone: values.phone?.startsWith("+")
        ? values.phone.slice(1)
        : values.phone,
    };
    try {
      await editContactMutation.mutateAsync(
        {
          contactId: contact.id,
          data,
        },
        {
          onSettled: () => {
            updateContactById(contact.id, (c) => ({
              ...c,
              name: values.name,
            }));
            setSelectedContact({ ...contact, ...data });
          },
        },
      );
    } catch (error) {
      console.error("Error updating contact:", error);
    }
  };

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const getCustomFieldValue = (fieldId) => {
    const customField = form
      .getValues()
      .customFields?.find((cf) => cf.fieldId === fieldId);
    return customField?.value || "";
  };

  const updateCustomField = (fieldId, value, customFieldData) => {
    const currentCustomFields = form.getValues().customFields || [];
    const existingIndex = currentCustomFields.findIndex(
      (cf) => cf.fieldId === fieldId,
    );

    if (existingIndex >= 0) {
      currentCustomFields[existingIndex].value = value;
    } else {
      currentCustomFields.push({
        id: customFieldData?.id,
        fieldId: fieldId,
        value: value,
      });
    }

    form.setFieldValue("customFields", [...currentCustomFields]);
  };

  const renderCustomField = (field) => {
    const fieldValue = getCustomFieldValue(field.slug);

    const commonProps = {
      label: field.name,
      placeholder: `Enter ${field.name}`,
      key: `customField-${field.slug}`,
      required: field.required,
    };

    switch (field.type) {
      case "email":
        return (
          <TextInput
            {...commonProps}
            type="email"
            value={fieldValue}
            onChange={(event) => {
              updateCustomField(field.slug, event.currentTarget.value, field);
            }}
          />
        );

      case "number":
        return (
          <NumberInput
            {...commonProps}
            value={fieldValue ? Number(fieldValue) : ""}
            onChange={(value) => {
              updateCustomField(field.slug, value?.toString() || "", field);
            }}
          />
        );

      case "multivalue":
        const options =
          field?.listValues?.map((option) => ({
            value: option,
            label: option,
          })) || [];

        return (
          <Select
            {...commonProps}
            data={options}
            value={fieldValue}
            onChange={(value) => {
              updateCustomField(field.slug, value || "", field);
            }}
            searchable
            clearable
          />
        );

      case "text":
      default:
        return (
          <TextInput
            {...commonProps}
            value={fieldValue}
            onChange={(event) => {
              updateCustomField(field.slug, event.currentTarget.value, field);
            }}
          />
        );
    }
  };

  // Icon-only view when closed
  if (!isOpen) {
    return (
      <Paper
        p="xs"
        style={{
          borderLeft: "1px solid #e9ecef",
        }}
        className="hidden"
      >
        <Stack gap="md" align="center" style={{ flex: 1 }} mt={6}>
          <CustomTooltip
            trigger={
              <Button variant="ghost" onClick={handleToggle}>
                <User />
              </Button>
            }
            content={<p>{t("Open Contact Details")}</p>}
            side="bottom"
          />

          {/* <CustomTooltip
          trigger={
            <Button variant="ghost" disabled>
              <Zap />
            </Button>
          }
          content={
            <p>{t("Recent Activity")}</p>
          }
          side="bottom"
         /> */}
        </Stack>
      </Paper>
    );
  }

  if (editable) {
    return (
      <motion.div
        className="p-3.5 border flex-shrink-0 min-w-[25vw] max-w-[25vw] flex flex-col max-h-screen"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        key="edit-mode"
      >
        <motion.div
          className="flex items-center justify-between mb-2.5 flex-shrink-0"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1, ease: "easeOut" }}
        >
          <h3 className="text-sm text-center flex-1">Edit Contact</h3>
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => setEditable(false)}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Cancel</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </motion.div>

        <motion.div
          className="text-center flex-shrink-0"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1, ease: "easeOut" }}
        >
          <div className="mx-auto mb-2.5 inline-block">
            <CreativeAvatar
              src={contact?.profilePic}
              size="xl"
              name={contact?.name || contact?.phone}
            />
          </div>
          <h3 className="mb-1 text-sm">{contact?.name || contact?.phone}</h3>
          <div className="flex items-center justify-center space-x-2 mb-2.5">
            {contact?.lifecycleName && (
              <Badge variant="outline" className={`text-[11px]`}>
                {contact.lifecycleName}
              </Badge>
            )}
          </div>
        </motion.div>

        <ScrollArea className="flex-1 h-[calc(100vh-250px)] py-4">
          <form onSubmit={form.onSubmit(handleSubmit)} className="p-3.5">
            <div className="flex flex-col gap-2">
              {/* Contact Information */}
              <motion.div
                className="flex flex-col gap-1"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.2 }}
              >
                <h4 className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2.5">
                  Contact Information
                </h4>
                <div className="space-y-2">
                  {/* Name Field */}
                  <motion.div
                    className="space-y-1"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.18, duration: 0.2 }}
                  >
                    <label className="text-[11px] text-muted-foreground">
                      {t("Name")}
                    </label>
                    <Input
                      placeholder={t("Enter name")}
                      className="h-7 text-xs"
                      {...form.getInputProps("name")}
                    />
                  </motion.div>

                  {/* Phone Field */}
                  <motion.div
                    className="space-y-1"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.21, duration: 0.2 }}
                  >
                    <label className="text-[11px] text-muted-foreground">
                      {t("Phone")}
                    </label>
                    <PhoneInputWithCountry
                      defaultCountry="IN"
                      international
                      countryCallingCodeEditable={false}
                      value={form.values.phone}
                      onChange={(value) =>
                        form.setFieldValue("phone", value || "")
                      }
                      borderRadius={4}
                      placeholder={t("Enter the phone")}
                      error={form.errors.phone}
                    />
                  </motion.div>

                  {/* Email Field */}
                  <motion.div
                    className="space-y-1"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.24, duration: 0.2 }}
                  >
                    <label className="text-[11px] text-muted-foreground">
                      {t("Email")}
                    </label>
                    <Input
                      type="email"
                      placeholder={t("Enter email")}
                      className="h-7 text-xs border border-gray-300 py-4 placeholder:text-gray-400"
                      {...form.getInputProps("email")}
                    />
                  </motion.div>
                </div>
              </motion.div>

              {/* <Separator /> */}

              {/* Additional Fields */}
              <motion.div
                className="flex flex-col gap-1"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.2 }}
              >
                <h4 className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2.5">
                  Additional Details
                </h4>
                <div className="space-y-2">
                  {/* Lifecycle Field */}
                  <div className="space-y-1">
                    <label className="text-[11px] text-muted-foreground">
                      {t("Lifecycle")}
                    </label>
                    <LifecycleInput
                      value={form.values.lifecycleId}
                      onChange={(value) =>
                        form.setFieldValue("lifecycleId", value)
                      }
                      placeholder={t("Enter lifecycle")}
                      width={"100%"}
                    />
                  </div>

                  {/* Other Field */}
                  <div className="space-y-1">
                    <label className="text-[11px] text-muted-foreground">
                      {t("Other")}
                    </label>
                    <Input
                      placeholder={t("Enter other")}
                      className="h-7 text-xs border border-gray-300 py-4 placeholder:text-gray-400"
                      {...form.getInputProps("other")}
                    />
                  </div>
                </div>
              </motion.div>

              {/* Custom Fields */}
              {customFields?.length > 0 && (
                <>
                  <Separator />
                  <motion.div
                    className="flex flex-col gap-1"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.33, duration: 0.2 }}
                  >
                    <h4 className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2.5">
                      {t("Custom Fields")}
                    </h4>
                    <div className="space-y-2">
                      {customFields.map((field) => renderCustomField(field))}
                    </div>
                  </motion.div>
                </>
              )}

              {/* <Separator /> */}

              {/* Action Buttons */}
              <motion.div
                className="flex flex-col gap-1 pt-1"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.36, duration: 0.2 }}
              >
                <Button
                  type="submit"
                  size="sm"
                  className="w-full h-8 text-xs"
                  disabled={editContactMutation.isPending || !form.isValid()}
                >
                  {editContactMutation.isPending ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      {t("Saving")}...
                    </div>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5 mr-1.5" />
                      {t("Save Changes")}
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full h-8 text-xs"
                  onClick={() => setEditable(false)}
                >
                  <X className="w-3.5 h-3.5 mr-1.5" />
                  {t("Cancel")}
                </Button>
              </motion.div>
            </div>
          </form>
        </ScrollArea>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="p-3.5 border flex-shrink-0 min-w-[25vw] max-w-[25vw]"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      key="view-mode"
    >
      <motion.div
        className="flex items-center justify-between mb-2.5"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1, ease: "easeOut" }}
      >
        <h3 className="text-sm text-center flex-1">Contact Details</h3>
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={handleToggle}
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Collapse Panel</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </motion.div>

      <motion.div
        className="text-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1, ease: "easeOut" }}
      >
        <div className="mx-auto mb-2.5 inline-block">
          <CreativeAvatar
            src={contact?.profilePic}
            size="xl"
            name={contact?.name || contact?.phone}
          />
        </div>
        <h3 className="mb-1 text-sm">{contact?.name || contact?.phone}</h3>
        <div className="flex items-center justify-center space-x-2 mb-2.5">
          {contact?.lifecycleName && (
            <Badge variant="outline" className={`text-[11px]`}>
              {contact.lifecycleName}
            </Badge>
          )}
        </div>
      </motion.div>

      <ScrollArea className="flex-1 h-[calc(100vh-250px)] py-4">
        <div className="p-3.5 flex flex-col gap-2">
          {/* Contact Information */}
          <motion.div
            className="flex flex-col gap-1"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.2 }}
          >
            <h4 className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2.5">
              Contact Information
            </h4>
            <div className="space-y-1.5">
              {contact?.phone && (
                <motion.div
                  className="flex items-start space-x-1.5 group"
                  whileHover={{ scale: 1.01, x: 2 }}
                  transition={{ duration: 0.2 }}
                >
                  <Phone className="w-3.5 h-3.5 text-muted-foreground mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-muted-foreground">Phone</p>
                    <div className="flex items-center justify-between">
                      <p className="text-xs">{contact.phone}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => {
                          navigator.clipboard.writeText(contact.phone || "");
                        }}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
              {contact.email && (
                <motion.div
                  className="flex items-start space-x-1.5 group"
                  whileHover={{ scale: 1.01, x: 2 }}
                  transition={{ duration: 0.2 }}
                >
                  <Mail className="w-3.5 h-3.5 text-muted-foreground mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-muted-foreground">Email</p>
                    <div className="flex items-center justify-between">
                      <p className="text-xs truncate">{contact.email}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                        onClick={() => {
                          navigator.clipboard.writeText(contact.email || "");
                        }}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
              {contact.whatsappUserName && (
                <motion.div
                  className="flex items-start space-x-1.5 group"
                  whileHover={{ scale: 1.01, x: 2 }}
                  transition={{ duration: 0.2 }}
                >
                  <IconBrandWhatsapp className="w-3.5 h-3.5 text-muted-foreground mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-muted-foreground">
                      Whatsapp Username
                    </p>
                    <div className="flex items-center justify-between">
                      <p className="text-xs truncate">
                        {contact.whatsappUserName}
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            contact.whatsappUserName || "",
                          );
                        }}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>

          <Separator />

          {customFields?.length > 0 && (
            <Stack gap="sm">
              {customFields.map((field) => renderCustomField(field))}
            </Stack>
          )}

          {/* Customer Stats */}
          <motion.div
            className="flex flex-col gap-1"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18, duration: 0.2 }}
          >
            <h4 className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2.5">
              Customer Stats
            </h4>
            <motion.div
              className="flex items-center justify-between p-1.5 rounded-lg bg-muted/50"
              whileHover={{ scale: 1.01, backgroundColor: "rgba(0,0,0,0.06)" }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center space-x-1.5">
                <div
                  className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${
                    contact?.blockedOnWhatsApp ? "bg-red-100" : "bg-green-100"
                  }`}
                >
                  <div
                    className={`w-1.5 h-1.5 rounded-full ${
                      contact?.blockedOnWhatsApp ? "bg-red-600" : "bg-green-600"
                    }`}
                  />
                </div>
                <span className="text-xs">{t("Status")}</span>
              </div>
              <span className="text-xs font-medium">
                {contact?.blockedOnWhatsApp ? t("Blocked") : t("Active")}
              </span>
            </motion.div>

            <motion.div
              className="flex items-center justify-between p-1.5 rounded-lg bg-muted/50"
              whileHover={{ scale: 1.01, backgroundColor: "rgba(0,0,0,0.06)" }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center space-x-1.5">
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-xs">{t("Source")}</span>
              </div>
              <span className="text-xs font-medium">
                {contact?.source || t("Unknown")}
              </span>
            </motion.div>

            <motion.div
              className="flex items-center justify-between p-1.5 rounded-lg bg-muted/50"
              whileHover={{ scale: 1.01, backgroundColor: "rgba(0,0,0,0.06)" }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center space-x-1.5">
                <Shield className="w-3.5 h-3.5 text-purple-600" />
                <span className="text-xs">{t("Consent")}</span>
              </div>
              <span className="text-xs font-medium">
                {contact?.consent ? t("Given") : t("Not given")}
              </span>
            </motion.div>

            <motion.div
              className="flex items-center justify-between p-1.5 rounded-lg bg-muted/50"
              whileHover={{ scale: 1.01, backgroundColor: "rgba(0,0,0,0.06)" }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center space-x-1.5">
                <Bot className="w-3.5 h-3.5 text-indigo-600" />
                <span className="text-xs">{t("AI Chat")}</span>
              </div>
              <span className="text-xs font-medium">
                {contact?.aiWaChat ? t("Enabled") : t("Disabled")}
              </span>
            </motion.div>

            <motion.div
              className="flex items-center justify-between p-1.5 rounded-lg bg-muted/50"
              whileHover={{ scale: 1.01, backgroundColor: "rgba(0,0,0,0.06)" }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center space-x-1.5">
                <UserCheck className="w-3.5 h-3.5 text-teal-600" />
                <span className="text-xs">{t("Assignment Status")}</span>
              </div>
              <span className="text-xs font-medium">
                {contact?.waMessageAssignStatus || t("Unknown")}
              </span>
            </motion.div>

            <motion.div
              className="flex items-center justify-between p-1.5 rounded-lg bg-muted/50"
              whileHover={{ scale: 1.01, backgroundColor: "rgba(0,0,0,0.06)" }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-orange-600" />
                <span className="text-xs">{t("Last seen")}</span>
              </div>
              <span className="text-[11px] font-medium">
                {contact?.lastReceivedMessageTimeStamp
                  ? new Date(
                      contact.lastReceivedMessageTimeStamp,
                    ).toLocaleString()
                  : t("Unknown")}
              </span>
            </motion.div>
          </motion.div>

          <Separator />

          <motion.div
            className="flex flex-col gap-1"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.21, duration: 0.2 }}
          >
            {contact?.assignedUsers && contact.assignedUsers.length > 0 ? (
              <div className="space-y-3">
                <h4 className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2.5">
                  Assigned Users
                </h4>
                <div className="space-y-2">
                  {contact.assignedUsers.map((user, index) => (
                    <motion.div
                      key={user.id}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.24 + index * 0.05, duration: 0.2 }}
                      whileHover={{ scale: 1.02, x: 2 }}
                    >
                      <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-medium">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <p className="text-xs font-light text-foreground">
                        {user.name}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-8 px-4">
                <p className="text-sm text-muted-foreground italic">
                  {t("No users assigned")}
                </p>
              </div>
            )}
          </motion.div>

          <Separator />

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.24, duration: 0.2 }}
          >
            <h4 className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2.5">
              Quick Actions
            </h4>
            <div className="space-y-1.5">
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-xs h-8"
                  onClick={() => setEditable(true)}
                >
                  <User className="w-3.5 h-3.5 mr-1.5" />
                  Edit Contact
                </Button>
              </motion.div>

              <DeleteContactButton
                t={t}
                contact={contact}
                deleteContactMutation={deleteContactMutation}
                handleToggle={handleToggle}
              />
            </div>
          </motion.div>
        </div>
      </ScrollArea>
    </motion.div>
  );
}

function DeleteContactButton({
  t,
  contact,
  deleteContactMutation,
  handleToggle,
}) {
  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger asChild>
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start text-xs h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            {t("Delete contact")}
          </Button>
        </motion.div>
      </AlertDialog.Trigger>

      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 bg-black/40 data-[state=open]:animate-fadeIn" />
        <AlertDialog.Content
          className="fixed left-1/2 top-1/2 w-[90%] max-w-sm -translate-x-1/2 -translate-y-1/2 
          rounded-lg bg-white p-6 shadow-lg focus:outline-none data-[state=open]:animate-zoomIn"
        >
          <AlertDialog.Title className="text-lg font-medium text-gray-900">
            {t("Delete contact")}
          </AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-sm text-gray-600">
            {t("Are you sure you want to delete this contact?")}
          </AlertDialog.Description>

          <div className="mt-6 flex justify-end space-x-3">
            <AlertDialog.Cancel asChild>
              <Button variant="outline" size="sm">
                {t("Cancel")}
              </Button>
            </AlertDialog.Cancel>

            <AlertDialog.Action asChild>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  deleteContactMutation.mutate(contact.id, {
                    onSuccess: handleToggle,
                  });
                }}
                disabled={deleteContactMutation.isPending}
              >
                {deleteContactMutation.isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    {t("Deleting")}...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                    {t("Delete contact")}
                  </>
                )}
              </Button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
