import { ActionIcon, Group, Stack, Table } from "@mantine/core";
import {
  ContainedTextArea,
  ContainedTextField,
} from "../../input/ContainedInput/ContainedInput";
import { useContext, useEffect, useState } from "react";
import SelectedLanguageContext from "../../../context/SelectedLanguage";
import {
  RateupButtonBlue,
  RateupButtonSecondary,
} from "../../Button/RateupButtons";
import {
  IconEdit,
  IconGripVertical,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { isNotEmpty, useForm } from "@mantine/form";
import FormModalLayout from "../../Modal/FormModalLayout";
import { useDisclosure } from "@mantine/hooks";
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import { reorder } from "../../../utils/questions";
import classes from "./Style.module.css";

const AddressExtraProps = ({ form }) => {
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const features = form.values.features?.[selectedLanguage] || {
    fields: [
      {
        fieldKey: "address1",
        placeholderText: "Address 1",
        fieldName: "Address 1",
      },
      { fieldKey: "address2", placeholderText: "Address 2" },
      { fieldKey: "city", placeholderText: "City" },
      { fieldKey: "state", placeholderText: "State" },
      { fieldKey: "country", placeholderText: "Country" },
      { fieldKey: "postalCode", placeholderText: "Postal Code" },
    ],
  };

  const [displayText, setDisplayText] = useState("");
  const [selectedField, setSelectedField] = useState(null);
  const [openedEditModal, { open: openEditModal, close: closeEditModal }] =
    useDisclosure(false);

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

  const handleDelete = (field) => {
    const fields = form.values.features?.[selectedLanguage]?.fields?.filter(
      (f) => f.fieldKey !== field?.fieldKey,
    );
    form.setFieldValue("features", {
      ...form.values.features,
      [selectedLanguage]: { ...features, fields },
    });
  };

  const addField = () => {
    if (fieldForm.validate().hasErrors) return;
    const existingFields = form.values.features?.[selectedLanguage]?.fields;
    if (existingFields?.find((f) => f.fieldKey === fieldForm.values.fieldKey))
      return;
    existingFields.push(fieldForm.values);
    form.setFieldValue("features", {
      ...form.values.features,
      [selectedLanguage]: { ...features, fields: existingFields },
    });
    fieldForm.reset();
  };

  useEffect(() => {
    if (!form.values.features?.[selectedLanguage]?.fields) {
      form.setFieldValue("features", {
        ...form.values.features,
        [selectedLanguage]: {
          ...features,
          fields: [
            { fieldKey: "address1", placeholderText: "Address 1" },
            { fieldKey: "address2", placeholderText: "Address 2" },
            { fieldKey: "city", placeholderText: "City" },
            { fieldKey: "state", placeholderText: "State" },
            { fieldKey: "country", placeholderText: "Country" },
            { fieldKey: "postalCode", placeholderText: "Postal Code" },
          ],
        },
      });
    }
  }, [form]);

  const rows = features?.fields?.map((f, index) => (
    <Draggable key={f?.fieldKeyl} index={index} draggableId={f?.fieldKey}>
      {(provided) => (
        <Table.Tr
          key={f?.fieldKey}
          className={classes.item}
          ref={provided.innerRef}
          {...provided.draggableProps}
        >
          <Table.Td>
            <div {...provided.dragHandleProps} className={classes.dragHandle}>
              <IconGripVertical size={20} stroke={1.5} />
            </div>
          </Table.Td>
          <Table.Td>{f?.fieldKey}</Table.Td>
          <Table.Td> {f?.placeholderText} </Table.Td>
          <Table.Td>
            <Group>
              <ActionIcon
                variant="subtle"
                onClick={() => {
                  setDisplayText(f.placeholderText);
                  setSelectedField(f);
                  openEditModal();
                }}
                size={"sm"}
              >
                <IconEdit />
              </ActionIcon>
              <ActionIcon
                variant="subtle"
                onClick={() => handleDelete(f)}
                size={"sm"}
              >
                <IconTrash color="red" />
              </ActionIcon>
            </Group>
          </Table.Td>
        </Table.Tr>
      )}
    </Draggable>
  ));

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

  const handleDragEnd = ({ destination, source }) => {
    const reorderedFields = reorder(
      features?.fields,
      source.index,
      destination?.index || 0,
    );
    form.setFieldValue("features", {
      ...form.values.features,
      [selectedLanguage]: {
        ...features,
        fields: reorderedFields,
      },
    });
  };

  return (
    <Stack>
      <DragDropContext onDragEnd={handleDragEnd}>
        <Table stickyHeader withRowBorders={false}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th></Table.Th>
              <Table.Th>Field key</Table.Th>
              <Table.Th>Display Text</Table.Th>
              <Table.Th></Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Droppable droppableId="dnd-list" direction="vertical">
            {(provided) => (
              <Table.Tbody {...provided.droppableProps} ref={provided.innerRef}>
                {rows}
                {provided.placeholder}
              </Table.Tbody>
            )}
          </Droppable>
        </Table>
      </DragDropContext>
      <Group>
        <ContainedTextField
          label={"Enter key for the field"}
          {...fieldForm.getInputProps("fieldKey")}
          w={200}
        />
        <ContainedTextArea
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

export default AddressExtraProps;
