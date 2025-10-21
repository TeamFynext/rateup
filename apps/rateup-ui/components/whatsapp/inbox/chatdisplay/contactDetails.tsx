"use client";

import { useEffect, useState } from "react";

import {
  ActionIcon,
  Avatar,
  Divider,
  Group,
  NumberInput,
  Paper,
  ScrollAreaAutosize,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import {
  IconBrandWhatsapp,
  IconClock,
  IconUser,
  IconX,
} from "@tabler/icons-react";
import {
  Activity,
  Bot,
  ChevronRight,
  Clock,
  Copy,
  Mail,
  MapPin,
  Phone,
  Shield,
  Tag,
  Trash2,
  User,
  UserCheck,
} from "lucide-react";
import { zod4Resolver } from "mantine-form-zod-resolver";
import { useTranslations } from "next-intl";
import { isValidPhoneNumber } from "react-phone-number-input";
import { z } from "zod/v4";

import { useContactsStore } from "@/app/dashboard/inbox/store";
import { useEditContactMutation } from "@/backend/campaign/contacts/contacts.query";
import { LifecycleInput } from "@/components/Contacts/LifecycleSelector";
import PhoneInputWithCountry from "@/components/input/PhoneInputWithCountry";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
}: WaInboxContactDetailsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const editContactMutation = useEditContactMutation(null);
  const { customFields } = useCustomFieldsContext();
  const { updateContactById, setSelectedContact } = useContactsStore();
  console.log(contact);

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
          <ActionIcon
            variant="outline"
            size="md"
            onClick={handleToggle}
            title={t("Open Contact Details")}
            color="black"
            radius={"md"}
          >
            <IconUser size="1.2rem" />
          </ActionIcon>

          <ActionIcon
            variant="outline"
            size="md"
            title={t("Recent Activity")}
            color="black"
            radius={"md"}
            disabled
          >
            <IconClock size="1.2rem" />
          </ActionIcon>
        </Stack>
      </Paper>
    );
  }

  // return (
  //   <Paper p="md" style={{ borderLeft: "1px solid #e9ecef" }} w={320}>
  //     <Group justify="space-between" mb="md">
  //       <Title order={4}>{t("Contact Details")}</Title>
  //       <ActionIcon variant="subtle" onClick={handleToggle}>
  //         <IconX size="1rem" />
  //       </ActionIcon>
  //     </Group>

  //     <form onSubmit={form.onSubmit(handleSubmit)}>
  //       <Stack gap="md">
  //         <ScrollAreaAutosize mah={600} pr={1}>
  //           <Stack gap="md">
  //             <Group justify="center">
  //               <Avatar
  //                 src={contact?.profilePic}
  //                 size="xl"
  //                 radius="50%"
  //                 name={contact?.name || contact?.phone}
  //                 color="initials"
  //               />
  //             </Group>

  //             <Stack gap="sm">
  //               <div>
  //                 <TextInput
  //                   label={t("Name")}
  //                   placeholder={t("Enter name")}
  //                   {...form.getInputProps("name")}
  //                 />
  //               </div>

  //               <div>
  //                 <Text size="sm" mb={3}>
  //                   {t("Phone")}
  //                 </Text>
  //                 <PhoneInputWithCountry
  //                   defaultCountry="IN"
  //                   international
  //                   countryCallingCodeEditable={false}
  //                   value={form.values.phone}
  //                   onChange={(value) =>
  //                     form.setFieldValue("phone", value || "")
  //                   }
  //                   borderRadius={4}
  //                   placeholder={t("Enter the phone")}
  //                   error={form.errors.phone}
  //                 />
  //               </div>

  //               <div>
  //                 <TextInput
  //                   label={t("WhatsApp Username")}
  //                   placeholder={t("Enter WhatsApp username")}
  //                   readOnly
  //                   {...form.getInputProps("whatsappUserName")}
  //                 />
  //               </div>
  //               <TextInput
  //                 label={t("Email")}
  //                 placeholder={t("Enter email")}
  //                 {...form.getInputProps("email")}
  //               />
  //               <div>
  //                 <LifecycleInput
  //                   label={t("Lifecycle")}
  //                   value={form.values.lifecycleId}
  //                   onChange={(value) =>
  //                     form.setFieldValue("lifecycleId", value)
  //                   }
  //                   placeholder={t("Enter lifecycle")}
  //                   width={"100%"}
  //                 />
  //               </div>
  //               <TextInput
  //                 label={t("Other")}
  //                 placeholder={t("Enter other")}
  //                 {...form.getInputProps("other")}
  //               />

  //               {customFields?.length > 0 && (
  //                 <Stack gap="sm">
  //                   {customFields.map((field) => renderCustomField(field))}
  //                 </Stack>
  //               )}
  //             </Stack>

  //             <Button
  //               type="submit"
  //               loading={editContactMutation.isPending}
  //               disabled={!form.isValid()}
  //             >
  //               {t("Save Changes")}
  //             </Button>

  //             <Divider />

  // <Stack gap="xs">
  //   <Text size="sm" c="dimmed">
  //     {t("Additional Info")}
  //   </Text>
  //   <Text size="sm">
  //     {t("Status")}:{" "}
  //     {contact?.blockedOnWhatsApp ? t("Blocked") : t("Active")}
  //   </Text>
  //   <Text size="sm">
  //     {t("Source")}: {contact?.source || t("Unknown")}
  //   </Text>
  //   <Text size="sm">
  //     {t("Consent")}:{" "}
  //     {contact?.consent ? t("Given") : t("Not given")}
  //   </Text>
  //   <Text size="sm">
  //     {t("AI Chat")}:{" "}
  //     {contact?.aiWaChat ? t("Enabled") : t("Disabled")}
  //   </Text>
  //   <Text size="sm">
  //     {t("Assignment Status")}:{" "}
  //     {contact?.waMessageAssignStatus || t("Unknown")}
  //   </Text>
  //   <Text size="sm">
  //     {t("Last seen")}:{" "}
  //     {contact?.lastReceivedMessageTimeStamp
  //       ? new Date(
  //           contact.lastReceivedMessageTimeStamp,
  //         ).toLocaleString()
  //       : t("Unknown")}
  //   </Text>
  // </Stack>

  //             <Divider />

  //             <Stack gap="xs">
  //               <Text size="sm" c="dimmed">
  //                 {t("Assigned Users")}
  //               </Text>
  //               {contact?.assignedUsers && contact.assignedUsers.length > 0 ? (
  //                 contact.assignedUsers.map((user, index) => (
  //                   <Text key={user.id} size="sm">
  //                     {user.name}
  //                   </Text>
  //                 ))
  //               ) : (
  //                 <Text size="sm">{t("No users assigned")}</Text>
  //               )}
  //             </Stack>
  //           </Stack>
  //         </ScrollAreaAutosize>
  //       </Stack>
  //     </form>
  //   </Paper>
  // );

  return (
    <div className="p-3.5 border flex-shrink-0 min-w-[20vw] max-w-[20vw]">
      <div className="flex items-center justify-between mb-2.5">
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
      </div>
      <div className="text-center">
        <div className="mx-auto mb-2.5 inline-block">
          <Avatar
            src={contact?.profilePic}
            size="xl"
            radius="50%"
            name={contact?.name || contact?.phone}
            color="initials"
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
      </div>
      <ScrollArea className="flex-1 h-[calc(100vh-250px)] py-4">
        <div className="p-3.5 flex flex-col gap-2">
          {/* Contact Information */}
          <div className="flex flex-col gap-1">
            <h4 className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2.5">
              Contact Information
            </h4>
            <div className="space-y-1.5">
              {contact?.phone && (
                <div className="flex items-start space-x-1.5 group">
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
                </div>
              )}
              {contact.email && (
                <div className="flex items-start space-x-1.5 group">
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
                </div>
              )}
              {contact.whatsappUserName && (
                <div className="flex items-start space-x-1.5 group">
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
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Customer Stats */}
          <div className="flex flex-col gap-1">
            <h4 className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2.5">
              Customer Stats
            </h4>
            <div className="flex items-center justify-between p-1.5 rounded-lg bg-muted/50">
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
            </div>

            <div className="flex items-center justify-between p-1.5 rounded-lg bg-muted/50">
              <div className="flex items-center space-x-1.5">
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-xs">{t("Source")}</span>
              </div>
              <span className="text-xs font-medium">
                {contact?.source || t("Unknown")}
              </span>
            </div>

            <div className="flex items-center justify-between p-1.5 rounded-lg bg-muted/50">
              <div className="flex items-center space-x-1.5">
                <Shield className="w-3.5 h-3.5 text-purple-600" />
                <span className="text-xs">{t("Consent")}</span>
              </div>
              <span className="text-xs font-medium">
                {contact?.consent ? t("Given") : t("Not given")}
              </span>
            </div>

            <div className="flex items-center justify-between p-1.5 rounded-lg bg-muted/50">
              <div className="flex items-center space-x-1.5">
                <Bot className="w-3.5 h-3.5 text-indigo-600" />
                <span className="text-xs">{t("AI Chat")}</span>
              </div>
              <span className="text-xs font-medium">
                {contact?.aiWaChat ? t("Enabled") : t("Disabled")}
              </span>
            </div>

            <div className="flex items-center justify-between p-1.5 rounded-lg bg-muted/50">
              <div className="flex items-center space-x-1.5">
                <UserCheck className="w-3.5 h-3.5 text-teal-600" />
                <span className="text-xs">{t("Assignment Status")}</span>
              </div>
              <span className="text-xs font-medium">
                {contact?.waMessageAssignStatus || t("Unknown")}
              </span>
            </div>

            <div className="flex items-center justify-between p-1.5 rounded-lg bg-muted/50">
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
            </div>
          </div>

          <Separator />
          <div className="flex flex-col gap-1">
            {contact?.assignedUsers && contact.assignedUsers.length > 0 ? (
              <div className="space-y-3">
                <h4 className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2.5">
                  Assigned Users
                </h4>
                <div className="space-y-2">
                  {contact.assignedUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                    >
                      <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-medium">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <p className="text-xs font-light text-foreground">
                        {user.name}
                      </p>
                    </div>
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
          </div>

          <Separator />

          {/* Quick Actions */}
          <div>
            <h4 className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2.5">
              Quick Actions
            </h4>
            <div className="space-y-1.5">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs h-8"
              >
                <Tag className="w-3.5 h-3.5 mr-1.5" />
                Manage Tags
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs h-8"
              >
                <User className="w-3.5 h-3.5 mr-1.5" />
                Edit Contact
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs h-8"
              >
                <Activity className="w-3.5 h-3.5 mr-1.5" />
                View Activity
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs h-8 text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Delete Contact
              </Button>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
