"use client";

import { forwardRef, useEffect, useState } from "react";

import { useForm } from "@mantine/form";
import { useDebouncedState, useDisclosure } from "@mantine/hooks";
import {
  IconBrandInstagram,
  IconBrandWhatsapp,
  IconX,
} from "@tabler/icons-react";
import { Table } from "@tanstack/react-table";
import {
  CheckCircle2,
  Download,
  Globe,
  Info,
  Instagram,
  Layers,
  MessageCircle,
  Plus,
  Search,
  Trash,
  Upload,
  UserPlus,
  UserRoundPlus,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { isValidPhoneNumber } from "react-phone-number-input";
import { toast } from "sonner";

import { ContactGroupType } from "@/types/enums";
import {
  useCreateContactMutation,
  useDeleteManyContactsMutation,
  useEditContactMutation,
  useExportContactsMutation,
  useImportCSVContactMutation,
} from "@/backend/campaign/contacts/contacts.query";
import ContactImportErrorModal from "@/components/Contacts/ContactImportErrorModal";
import { ContactForm } from "@/components/Contacts/CreateContactModal";
import { CustomFieldForm } from "@/components/Contacts/label-form";
import { LifecycleSelector } from "@/components/Contacts/LifecycleSelector";
import { getSourceBadge } from "@/components/Contacts/utils/utils";
import PhoneInputWithCountry from "@/components/input/PhoneInputWithCountry";
import { DataTableViewOptions } from "@/components/Table/data-table-view-option";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import CustomAlertDialog from "@/components/ui/custom/CustomAlertDialog";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { getInitials } from "@/components/ui/utils";
import { useCustomFieldsContext } from "@/context/CustomFieldsContext";
import { importMethod } from "@/utils/enums";
import { getFileUrlFromKey } from "@/utils/file-upload/upload";

import { useContactTableStore } from "../store/contact-table-store";

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
}

export function DataTableToolbar<TData>({
  table,
}: Readonly<DataTableToolbarProps<TData>>) {
  const isFiltered = table.getState().columnFilters.length > 0;
  const { filter, setFilter } = useContactTableStore();
  const t = useTranslations();

  const [isOpenedAddContactModal, setIsOpenedAddContactModal] = useState(false);

  const SourceSelector = () => {
    const ContactSources = [
      { label: "All Sources", value: "all", icon: Layers },
      { label: "WhatsApp", value: "whatsapp", icon: IconBrandWhatsapp },
      { label: "Instagram", value: "instagram", icon: Instagram },
      { label: "Web", value: "WEBCHAT", icon: Globe },
      { label: "Manual", value: "manual", icon: UserRoundPlus },
      { label: "Imported", value: "csv import", icon: Upload },
    ];
    return (
      <Select
        value={filter.source}
        onValueChange={(value) => setFilter({ ...filter, source: value })}
      >
        <SelectTrigger className="w-[150px] bg-gray-100 border-none">
          <span className="text-sm ">
            <SelectValue placeholder="Select Source" />
          </span>
        </SelectTrigger>
        <SelectContent>
          {ContactSources.map((source) => (
            <SelectItem key={source.value} value={source.value}>
              <div className="flex items-center">
                <source.icon className="mr-2" />
                <span>{source.label}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  };

  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [openImportModal, setOpenImportModal] = useState(false);
  const deleteManyContactsMutation = useDeleteManyContactsMutation();
  function handleDeleteContacts() {
    const selectedIds = Object.keys(table.getState().rowSelection);
    deleteManyContactsMutation?.mutate(selectedIds, {
      onSuccess: () => {
        toast.success("contact deleted successfully");
        table.setRowSelection({});
      },
      onError: () => {
        toast.error("Error deleting contacts");
      },
    });
  }

  return (
    <Card className="p-4 mb-4">
      <div className="flex justify-between gap-2">
        <div className="flex items-center gap-2 flex-1">
          {table.getState().rowSelection.length && (
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setOpenDeleteModal(true)}
            >
              <Trash />
            </Button>
          )}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, phone, or email..."
              className="pl-10 placeholder:text-sm bg-gray-100 border-none"
              value={filter.searchTerm}
              onChange={(event) =>
                setFilter({ ...filter, searchTerm: event.currentTarget.value })
              }
            />
          </div>
          <LifecycleSelector
            all={true}
            className="bg-gray-100 border-none w-48"
            value={filter?.lifecycleId}
            onChange={(value, lifecycleObj) =>
              setFilter({ ...filter, lifecycleId: value })
            }
          />
          <SourceSelector />
          <Button
            variant="default"
            className="bg-rateup-blue"
            size="sm"
            onClick={() => setIsOpenedAddContactModal(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            <span className="font-medium text-sm">Add Contact</span>
          </Button>
          <ExportContacts table={table} />

          <Button
            variant="outline"
            size="sm"
            onClick={() => setOpenImportModal(true)}
          >
            <Upload className="w-4 h-4 mr-2" />
            <span className="font-medium text-sm">{t("Import")}</span>
          </Button>
          <ImportContactModal
            opened={openImportModal}
            setOpened={setOpenImportModal}
          />
          {isFiltered && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => table.resetColumnFilters()}
            >
              Reset
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <DataTableViewOptions table={table} />
        </div>
        <CreateOrEditContactModal
          opened={isOpenedAddContactModal}
          setOpened={setIsOpenedAddContactModal}
        />
        <CustomAlertDialog
          buttonTitle="Delete"
          title={"Delete contact"}
          description="Are you sure to delete these selected contacts?"
          onAction={handleDeleteContacts}
          buttonColor="bg-red-500"
          onCancel={() => {
            table.setRowSelection({});
          }}
          opened={openDeleteModal}
          setOpened={setOpenDeleteModal}
        />
      </div>
    </Card>
  );
}

const ExportContacts = ({ table }) => {
  const exportMut = useExportContactsMutation();
  const leafColumns = table
    .getAllLeafColumns()
    ?.filter(
      (column) =>
        column.getIsVisible() && !["select", "action"].includes(column.id),
    )
    ?.map((col) => col.id);

  const handleExport = (type: string) => {
    if (!leafColumns?.length) {
      toast.error("Please select at least one field to export.");
      return;
    }
    exportMut.mutate({
      type,
      fields: leafColumns,
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Button variant="outline" size="sm">
          <Download className="w-4 h-4 mr-2" />
          <span className="font-medium text-sm">Export</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={() => handleExport("csv")}>
          Download as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("xlsx")}>
          Download as Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export const CreateOrEditContactModal = ({
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
  const t = useTranslations();
  const { customFields } = useCustomFieldsContext();
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
              return t("Invalid email format");
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
    let contactData = {
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
          onError: () => {
            toast.error("Error in updating contact");
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
          onError: () => {
            toast.error("Error in adding contact");
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
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rateup-blue to-blue-600 flex items-center justify-center">
                <UserPlus className="w-4 h-4 text-white" />
              </div>
            )}
            {initialValues ? t("Edit Contact") : t("Add Contact")}
          </DialogTitle>
          <DialogDescription>
            {initialValues
              ? t("Update contact information and preferences")
              : t("Fill the details and click save")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {initialValues && (
            <div className="flex items-center gap-3 pb-3 border-b">
              <Avatar className="w-16 h-16">
                <AvatarImage src={initialValues.profilePic} />
                <AvatarFallback className="bg-gradient-to-br from-rateup-blue to-blue-600 text-white">
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
          {customFields?.length > 0 && (
            <div className="border flex self-end gap-1 p-1 w-fit">
              {customFields.map((field) => (
                <div className="flex items-center gap-1 rounded-lg p-1 w-fit px-2">
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
          <DialogFooter>
            <DialogClose>
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
        </div>
      </DialogContent>
    </Dialog>
  );
};

const ImportContactModal = ({ opened, setOpened }) => {
  const t = useTranslations();

  const handleDownloadDemo = () => {
    // Example: download a text file (you can replace this with any file URL)
    const fileUrl = getFileUrlFromKey("/File/contact/demo.csv", false);
    const link = document.createElement("a");
    link.href = fileUrl;
    link.download = "example.pdf"; // Suggested filename
    link.click();
  };
  const [csvfile, setCsvfile] = useState<File | null>(null);
  const [updateExisting, setUpdateExisting] = useState(false);
  const importCSVContactMutation = useImportCSVContactMutation();
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState([]);
  const { customFields } = useCustomFieldsContext();

  useEffect(() => {
    if (csvfile) {
      const fileExtension = csvfile.name.split(".").pop()?.toLowerCase();
      if (fileExtension !== "csv" && fileExtension !== "xlsx") {
        setError(t("Please upload a valid CSV or XLSX file."));
      } else {
        setError(null);
      }
    }
  }, [csvfile, t]);
  function handleImportContacts() {
    if (!csvfile) {
      setError(t("Please select a CSV file to import."));
      return;
    }
    const formData = new FormData();
    formData.append("update", updateExisting ? "true" : "false");
    formData.append("file", csvfile);
    fields.forEach((item, index) => {
      formData.append(`tags[${index}]`, item.slug);
    });
    importCSVContactMutation.mutate(formData, {
      onSettled: () => {
        setCsvfile(null);
      },
      onSuccess: () => {
        toast.success("Contact imported successfully");
        setOpened(false);
      },
      onError: () => {
        toast.error("Importing failed");
        setOpened(false);
      },
    });
  }

  function reset() {
    setCsvfile(null);
    setUpdateExisting(false);
    setError(null);
  }

  useEffect(() => {
    setFields(customFields);
  }, [customFields]);

  return (
    <Dialog open={opened} onOpenChange={setOpened}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-md">{t("Import Contacts")}</DialogTitle>
          <DialogDescription>
            {t(
              "Import contacts from a CSV file to add them to your contact list",
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 p-6">
          <p className="text-sm">{t("Custom Fields")}</p>
          <div className="flex gap-2">
            {customFields.map((field) => (
              <div className="flex items-center gap-3 rounded-lg bg-blue-100 p-1 w-fit px-2">
                <Checkbox
                  checked={fields.some((p) => p.id === field.id)}
                  id={field.id}
                  className="rounded-xl data-[state=unchecked]:bg-gray-200"
                  onCheckedChange={(checked) => {
                    setFields((prev) =>
                      checked
                        ? [...prev, field]
                        : prev.filter((p) => p.id !== field.id),
                    );
                  }}
                />
                <Label htmlFor={field.id} className="text-sm font-normal">
                  {field.name}
                </Label>
              </div>
            ))}
          </div>

          <blockquote className="border-l-4 border-blue-500 bg-blue-50 p-4 flex flex-col gap-2">
            <div className="flex gap-2 text-blue-700 text-sm">
              <Info />
              {t(
                "Utilizing CSV/XLSX file uploads to generate contact requires specific fields in the file: name, phone",
              )}
            </div>

            <Button variant="secondary" onClick={handleDownloadDemo}>
              <Upload />
              <span className="font-medium text-sm">
                {t("Download Demo Csv File")}
              </span>
            </Button>
          </blockquote>
          <div className="flex items-center space-x-2 mt-4">
            <Switch
              id="update-existing-data"
              className="data-[state=unchecked]:bg-gray-400"
              checked={updateExisting}
              onCheckedChange={setUpdateExisting}
            />
            <Label htmlFor="update-existing-data">
              {t("Update the existing data while importing")}
            </Label>
          </div>
          <div className="grid items-center gap-3 mt-4">
            <Input
              id="contact-csv"
              type="file"
              accept=".csv,.xlsx"
              onChange={(e) => setCsvfile(e.target.files?.[0] || null)}
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex justify-end gap-2 mt-6 text-sm">
            <DialogClose asChild>
              <Button variant="secondary" onClick={reset}>
                {t("Cancel")}
              </Button>
            </DialogClose>

            <Button onClick={handleImportContacts}>
              {importCSVContactMutation.isPending && <Spinner />}
              {t("Import")}
            </Button>
          </div>
        </div>
      </DialogContent>
      <ContactImportErrorModal
        body={importCSVContactMutation?.error?.response?.data}
        isError={importCSVContactMutation.isError}
      />
    </Dialog>
  );
};
