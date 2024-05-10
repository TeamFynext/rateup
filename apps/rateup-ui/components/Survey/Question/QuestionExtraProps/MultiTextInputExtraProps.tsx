import { useContext, useEffect, useState } from "react";
import SelectedLanguageContext from "../../../../context/SelectedLanguage";
import { Group, Stack } from "@mantine/core";
import DraggableTable from "../../../styled/Table/DraggableTable";
import { IconPlus } from "@tabler/icons-react";
import {
  RateupButtonSecondary,
  RateupButtonBlue,
} from "../../../Button/RateupButtons";
import {
  ContainedTextField,
  ContainedTextArea,
} from "../../../input/ContainedInput/ContainedInput";
import FormModalLayout from "../../../Modal/FormModalLayout";
import { useForm, isNotEmpty } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";

const MultiTextInputExtraProps = ({ form }) => {
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const features = form.values.features?.[selectedLanguage];

  const headers = [
    { headerKey: "fieldKey", headerValue: "Field Key" },
    { headerKey: "placeholderText", headerValue: "Display Text" },
  ];
  const [openedEditModal, { open: openEditModal, close: closeEditModal }] =
    useDisclosure(false);
  const [displayText, setDisplayText] = useState("");
  const [selectedField, setSelectedField] = useState(null);

  const fieldForm = useForm({
    initialValues: {
      fieldKey: "",
      placeholderText: "",
    },
    validate: {
      fieldKey: (value) =>
        !value?.trim().length
          ? "Field key cannot be empty"
          : !/^[a-zA-Z0-9_]+$/.test(value)
            ? "only alphabets, digits and underscore are allowed"
            : null,
      placeholderText: isNotEmpty("Display Text cannot be empty"),
    },
  });
  const handleDragEnd = (values) => {
    form.setFieldValue("features", {
      ...form.values.features,
      [selectedLanguage]: { ...features, fields: values },
    });
  };

  const addField = () => {
    if (fieldForm.validate().hasErrors) return;
    const existingFields =
      form.values.features?.[selectedLanguage]?.fields ?? [];
    if (existingFields?.find((f) => f.fieldKey === fieldForm.values.fieldKey))
      return;
    existingFields.push(fieldForm.values);
    form.setFieldValue("features", {
      ...form.values.features,
      [selectedLanguage]: { ...features, fields: existingFields },
    });
    fieldForm.reset();
  };
  const handleEditDisplayText = () => {
    form.setFieldValue("features", {
      ...form.values.features,
      [selectedLanguage]: {
        ...features,
        fields: features?.fields?.map((f) => {
          if (f.fieldKey === selectedField?.fieldKey) {
            return { ...f, placeholderText: displayText };
          }
          return f;
        }),
      },
    });
    setDisplayText("");
    closeEditModal();
  };

  const handleEdit = (field) => {
    setDisplayText(field?.placeholderText);
    setSelectedField(field);
    openEditModal();
  };

  const handleDelete = (field) => {
    const fields = form.values.features?.[selectedLanguage]?.fields?.filter(
      (f) => f.fieldKey !== field?.fieldKey,
    );
    form.setFieldValue("features", {
      ...form.values.features,
      [selectedLanguage]: { ...features, fields },
    });
  };

  useEffect(() => {
    if (!form.values.features?.[selectedLanguage]?.fields) {
      form.setFieldValue("features", {
        ...form.values.features,
        [selectedLanguage]: {
          ...features,
          fields: [
            {
              fieldKey: "name",
              placeholderText: "Name",
            },
          ],
        },
      });
    }
  }, [form]);

  return (
    <Stack>
      <DraggableTable
        headers={headers}
        handleDragEnd={handleDragEnd}
        items={features?.fields}
        editEnabled
        deleteEnabled
        handleEdit={handleEdit}
        handleDelete={handleDelete}
        itemUniqueKey={"fieldKey"}
        withRowBorder={false}
      />
      <Group>
        <ContainedTextField
          label={"Enter key for the field"}
          {...fieldForm.getInputProps("fieldKey")}
          w={200}
        />
        <ContainedTextField
          label={"Enter display text for field"}
          w={350}
          {...fieldForm.getInputProps("placeholderText")}
        />
        <RateupButtonSecondary
          title="Add Field"
          rightIcon={<IconPlus />}
          onClick={() => addField()}
          mt={"md"}
        />
      </Group>
      <FormModalLayout
        opened={openedEditModal}
        onClose={closeEditModal}
        title="Edit Display Text"
        centered
      >
        <Stack justify="center">
          <ContainedTextArea
            value={displayText}
            onChange={(event) => {
              setDisplayText(event.target.value);
            }}
            autosize
          />
          <RateupButtonBlue
            title="Update Display Text"
            onClick={handleEditDisplayText}
          />
        </Stack>
      </FormModalLayout>
    </Stack>
  );
};

export default MultiTextInputExtraProps;
