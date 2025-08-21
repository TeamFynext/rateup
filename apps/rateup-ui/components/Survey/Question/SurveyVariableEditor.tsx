import React, { useContext, useEffect, useState } from "react";

import {
  ActionIcon,
  Flex,
  Group,
  ScrollAreaAutosize,
  Stack,
  TextInput,
  Title,
} from "@mantine/core";
import { isNotEmpty, matches, useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { IconEdit, IconPlus, IconTrash } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import {
  useCreateSurveyVariableMutation,
  useDeleteSurveyVariableMutation,
  useUpdateSurveyVariableMutation,
} from "../../../backend/surveys/surveys.query";
import SurveyContext from "../../../context/SurveyContext";
import { SurveyVariableType } from "../../../types/enums";
import { RateupButtonSecondary } from "../../Button/RateupButtons";
import { ContainedTextField } from "../../input/ContainedInput/ContainedInput";
import FormModalLayout from "../../Modal/FormModalLayout";
import PaperLayout from "../../styled/Layouts/PaperLayout";
import { QuestionTabsEnum } from "../EditSurvey";

const SurveyVariableEditor = ({ setActiveTab }) => {
  const { variables, surveyId } = useContext(SurveyContext);
  const [
    openedCreateVariable,
    { open: openCreateVariable, close: closeCreateVariable },
  ] = useDisclosure(false);
  const [
    openedEditVariable,
    { open: openEditVariable, close: closeEditVariable },
  ] = useDisclosure(false);
  const [selectedVariable, setSelectedVariable] =
    useState<SurveyVariable>(null);
  const deleteVariable = useDeleteSurveyVariableMutation(surveyId);

  const handleDeleteVariable = (variable: SurveyVariable) => {
    deleteVariable.mutate({ variableId: variable.id });
  };
  const translations = useTranslations();
  return (
    <Stack w={"100%"}>
      <ScrollAreaAutosize h={430} scrollbarSize={6}>
        <Stack gap={"sm"} p={"sm"}>
          <PaperLayout p={"sm"}>
            <Title order={5}>{translations("Default Variables")}</Title>
            <Group gap={"xs"} pt={"sm"}>
              {variables
                ?.filter(
                  (variable) => variable?.type === SurveyVariableType.DEFAULT,
                )
                .map((variable) => (
                  <Group key={variable?.id}>
                    <TextInput readOnly value={variable?.name} />
                  </Group>
                ))}
            </Group>
          </PaperLayout>
          <PaperLayout p={"sm"}>
            <Group justify="space-between">
              <Title order={5}>{translations("Custom Variables")}</Title>
              <RateupButtonSecondary
                title={translations("Add Variable")}
                leftIcon={<IconPlus size={"1rem"} />}
                onClick={openCreateVariable}
              />
            </Group>
            <Stack gap={"xs"} pt={"sm"}>
              {variables
                ?.filter(
                  (variable) => variable?.type === SurveyVariableType.CUSTOM,
                )
                .map((variable) => (
                  <Group key={variable?.id}>
                    <TextInput readOnly value={variable?.name} />
                    <TextInput readOnly value={variable?.value} />
                    <ActionIcon
                      size={"xs"}
                      variant="subtle"
                      onClick={() => {
                        setSelectedVariable(variable);
                        openEditVariable();
                      }}
                    >
                      <IconEdit />
                    </ActionIcon>
                    <ActionIcon
                      variant="subtle"
                      size={"xs"}
                      onClick={() => handleDeleteVariable(variable)}
                    >
                      <IconTrash />
                    </ActionIcon>
                  </Group>
                ))}
            </Stack>
          </PaperLayout>
        </Stack>
      </ScrollAreaAutosize>
      <Group justify="space-between" pb={"xl"}>
        <RateupButtonSecondary
          title={translations("Cancel")}
          size="md"
          variant="outline"
          color="var(--tertiary-color)"
          onClick={() => setActiveTab(QuestionTabsEnum.Edit)}
        />
      </Group>
      <CreateSurveyVariableModal
        opened={openedCreateVariable}
        close={closeCreateVariable}
      />
      <CreateSurveyVariableModal
        opened={openedEditVariable}
        close={closeEditVariable}
        variable={selectedVariable}
        isEdit={true}
      />
    </Stack>
  );
};

interface ICreateVariableProps {
  opened: boolean;
  close: () => void;
  variable?: SurveyVariable;
  isEdit?: boolean;
}
const CreateSurveyVariableModal = ({
  opened,
  close,
  variable,
  isEdit,
}: ICreateVariableProps) => {
  const { surveyId, variables } = useContext(SurveyContext);
  const variableCreation = useCreateSurveyVariableMutation(surveyId);
  const variableUpdation = useUpdateSurveyVariableMutation(surveyId);
  const translations = useTranslations();
  const form = useForm({
    initialValues: {
      name: variable?.name || "",
      value: variable?.value || "",
    },
    validate: {
      name: matches(
        /^[a-zA-Z0-9_]+$/,
        translations(
          "Variable name can only have letters, numbers and underscore",
        ),
      ),
      value: isNotEmpty("Assign a value to variable"),
    },
  });
  const handleSubmit = () => {
    if (form.validate().hasErrors) return;
    if (variables.find((v) => v?.name == form.values.name)) {
      form.setFieldError("name", "Variable already exist");
      return;
    }
    const data = { ...form.values, type: SurveyVariableType.CUSTOM };
    variableCreation.mutate(
      { surveyId, data },
      {
        onSuccess: () => {
          form.reset();
          close();
        },
        onError: () => {
          form.reset();
        },
      },
    );
  };
  const handleUpdate = () => {
    if (form.validate().hasErrors) return;
    if (
      variables.find((v) => v?.name == form.values.name) &&
      variable?.name !== form.values.name
    ) {
      form.setFieldError("name", "Variable already exist");
      return;
    }
    variableUpdation.mutate(
      { variableId: variable.id, data: form.values },
      {
        onSuccess: () => {
          form.reset();
          close();
        },
        onError: () => {
          form.reset();
        },
      },
    );
  };

  useEffect(() => {
    form.setValues({ name: variable?.name, value: variable?.value });
  }, [variable]);

  return (
    <FormModalLayout
      opened={opened}
      onClose={close}
      title={
        isEdit
          ? translations("Update Variable")
          : translations("Create Variable")
      }
      includeCancelButton
      buttonTitle={isEdit ? translations("Update") : translations("Create")}
      cancelOnClick={() => {
        form.reset();
        close();
      }}
      centered
      onSubmit={isEdit ? handleUpdate : handleSubmit}
      isLoading={
        isEdit ? variableUpdation.isPending : variableCreation.isPending
      }
    >
      <Stack>
        <ContainedTextField {...form.getInputProps("name")} label="Name" />
        <ContainedTextField {...form.getInputProps("value")} label="Value" />
      </Stack>
    </FormModalLayout>
  );
};

export default SurveyVariableEditor;
