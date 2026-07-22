import { IconPlus } from "@tabler/icons-react";
import { useContext, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import SelectedLanguageContext from "@/context/SelectedLanguage.ts";

import DraggableTable from "../../../styled/Table/DraggableTable.tsx";

type FieldFormValues = {
  fieldKey: string;
  placeholderText: string;
};

const MultiTextInputExtraProps = ({ form }) => {
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const features = form.values.features?.[selectedLanguage];
  const { t: translations } = useTranslation();

  const [openedEditModal, setOpenedEditModal] = useState(false);
  const [displayText, setDisplayText] = useState("");
  const [selectedField, setSelectedField] = useState<any>(null);

  const headers = [
    { headerKey: "fieldKey", headerValue: translations("Field Key") },
    { headerKey: "placeholderText", headerValue: translations("Display Text") },
  ];

  const {
    register,
    handleSubmit,
    reset: resetFieldForm,
    formState: { errors },
  } = useForm<FieldFormValues>({
    defaultValues: { fieldKey: "", placeholderText: "" },
  });

  const handleDragEnd = (values: any[]) => {
    form.setFieldValue("features", {
      ...form.values.features,
      [selectedLanguage]: { ...features, fields: values },
    });
  };

  const addField = handleSubmit((values) => {
    const existingFields: any[] = form.values.features?.[selectedLanguage]?.fields ?? [];
    if (existingFields.find((f) => f.fieldKey === values.fieldKey)) return;
    form.setFieldValue("features", {
      ...form.values.features,
      [selectedLanguage]: { ...features, fields: [...existingFields, values] },
    });
    resetFieldForm();
  });

  const handleEditDisplayText = () => {
    form.setFieldValue("features", {
      ...form.values.features,
      [selectedLanguage]: {
        ...features,
        fields: features?.fields?.map((f) =>
          f.fieldKey === selectedField?.fieldKey ? { ...f, placeholderText: displayText } : f,
        ),
      },
    });
    setDisplayText("");
    setOpenedEditModal(false);
  };

  const handleEdit = (field: any) => {
    setDisplayText(field?.placeholderText);
    setSelectedField(field);
    setOpenedEditModal(true);
  };

  const handleDelete = (field: any) => {
    form.setFieldValue("features", {
      ...form.values.features,
      [selectedLanguage]: {
        ...features,
        fields: features?.fields?.filter((f) => f.fieldKey !== field?.fieldKey),
      },
    });
  };

  useEffect(() => {
    if (!form.values.features?.[selectedLanguage]?.fields) {
      form.setFieldValue("features", {
        ...form.values.features,
        [selectedLanguage]: {
          ...features,
          fields: [{ fieldKey: "name", placeholderText: "Name" }],
        },
      });
    }
  }, [form]);

  return (
    <div className="flex flex-col gap-3">
      <DraggableTable
        headers={headers}
        handleDragEnd={handleDragEnd}
        items={features?.fields}
        editEnabled
        deleteEnabled
        handleEdit={handleEdit}
        handleDelete={handleDelete}
        itemUniqueKey="fieldKey"
        withRowBorder={false}
      />

      <div className="rounded-lg border bg-background p-3">
        <FieldGroup>
          <div className="flex flex-wrap items-end gap-3">
            <Field data-invalid={!!errors.fieldKey} className="flex-1 min-w-[160px]">
              <FieldLabel>{translations("Field Key")}</FieldLabel>
              <Input
                placeholder={translations("e.g. email")}
                {...register("fieldKey", {
                  required: translations("Field key cannot be empty"),
                  validate: (v) =>
                    /^[a-zA-Z0-9_]+$/.test(v.trim()) ||
                    translations("Only alphabets, digits and underscore are allowed"),
                })}
              />
              {errors.fieldKey && (
                <FieldDescription className="text-destructive">
                  {errors.fieldKey.message}
                </FieldDescription>
              )}
            </Field>

            <Field data-invalid={!!errors.placeholderText} className="flex-[2] min-w-[200px]">
              <FieldLabel>{translations("Display Text")}</FieldLabel>
              <Input
                placeholder={translations("e.g. Email address")}
                {...register("placeholderText", {
                  required: translations("Display Text cannot be empty"),
                })}
              />
              {errors.placeholderText && (
                <FieldDescription className="text-destructive">
                  {errors.placeholderText.message}
                </FieldDescription>
              )}
            </Field>

            <Button type="button" variant="outline" size="sm" onClick={addField}>
              <IconPlus data-icon="inline-start" />
              {translations("Add Field")}
            </Button>
          </div>
        </FieldGroup>
      </div>

      <Dialog open={openedEditModal} onOpenChange={(open) => !open && setOpenedEditModal(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{translations("Edit Display Text")}</DialogTitle>
          </DialogHeader>
          <Textarea value={displayText} onChange={(e) => setDisplayText(e.target.value)} rows={3} />
          <DialogFooter>
            <Button onClick={handleEditDisplayText}>{translations("Update Display Text")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MultiTextInputExtraProps;
