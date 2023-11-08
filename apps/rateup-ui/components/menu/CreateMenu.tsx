import {
  useCreateMenuMutation,
  useUpdateMenuMutation,
} from "../../backend/menu/menu.query";
import { useContext, useEffect, useState } from "react";
import { Center, Group, SimpleGrid, Stack, Title } from "@mantine/core";
import { useForm } from "@mantine/form";
import SelectedTeamContext from "../../context/SelectedTeam";
import { getFileUrlFromKey, uploadFile } from "../../utils/file-upload/upload";
import { showErrorToast } from "../../utils/notifications";
import classes from "./CreateMenu.module.css";
import FormModalLayout from "../Modal/FormModalLayout";
import {
  ContainedFileInput,
  ContainedSelection,
  ContainedTextField,
} from "../input/ContainedInput/ContainedInput";
import PaperLayout from "../styled/Layouts/PaperLayout";
import { TeamSelector } from "../input/TeamSelector";
import { Image } from "@mantine/core";

export function CreateMenuModal({ opened, close, editingItem }) {
  const { selectedTeamId } = useContext(SelectedTeamContext);
  const [isCreating, setIsCreating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const createMenuMutation = useCreateMenuMutation(
    selectedTeamId,
    close,
    setIsCreating,
  );
  const updateMenuMutation = useUpdateMenuMutation(
    selectedTeamId,
    () => {
      close();
      setIsCreating(false);
    },
    () => {
      setIsCreating(false);
    },
  );

  const form = useForm({
    initialValues: editingItem || {
      name: "",
      displayName: "",
      teamId: "",
    },
    validate: {
      name: (value) => (value?.trim().length ? null : "Cannot be empty"),
      displayName: (value) => (value?.trim().length ? null : "Cannot be empty"),
      teamId: (value) => (value?.trim().length ? null : "select a team"),
    },
  });

  useEffect(() => {
    if (editingItem) {
      form.setValues(editingItem);
    } else {
      form.reset();
    }
  }, [editingItem]);

  const onSubmit = (values) => {
    const validationRes = form.validate();
    if (validationRes.hasErrors) {
      console.error(validationRes.errors);
      return;
    }
    setIsCreating(true);
    if (editingItem) {
      updateMenuMutation.mutate({
        menuId: editingItem.id,
        updatedData: values,
      });
    } else {
      createMenuMutation.mutate(values);
    }
  };

  if (!selectedTeamId) {
    return null;
  }
  return (
    <FormModalLayout
      opened={opened}
      onClose={close}
      title={editingItem ? "Edit Menu" : "Create Menu"}
      centered
      onSubmit={form.onSubmit(onSubmit)}
      buttonTitle={editingItem ? "Edit Menu" : "Create Menu"}
    >
      <Title order={3}>General Info</Title>
      <Stack>
        <TeamSelector
          placeholder="Select Team"
          label=""
          allowDeselect={false}
          {...form.getInputProps("teamId")}
        />
        <ContainedTextField
          label="Menu Name"
          placeholder="Menu 1"
          withAsterisk
          {...form.getInputProps("name")}
        />
        <ContainedTextField
          label="Display Name"
          placeholder="Paragon Restaurant"
          withAsterisk
          {...form.getInputProps("displayName")}
        />
      </Stack>
    </FormModalLayout>
  );
}
