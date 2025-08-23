import { useContext, useEffect } from "react";

import { LoadingOverlay, Stack, Title } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useTranslations } from "next-intl";

import {
  useCreateMenuMutation,
  useUpdateMenuMutation,
} from "../../backend/menu/menu.query";
import SelectedTeamContext from "../../context/SelectedTeam";
import { ContainedTextField } from "../input/ContainedInput/ContainedInput";
import { TeamSelector } from "../input/TeamSelector";
import FormModalLayout from "../Modal/FormModalLayout";

interface CreateMenuModalProps {
  readonly opened: boolean;
  readonly close: () => void;
  readonly editingItem?: Menu;
}
export function CreateMenuModal({
  opened,
  close,
  editingItem,
}: CreateMenuModalProps) {
  const { selectedTeamId } = useContext(SelectedTeamContext);
  const translations = useTranslations();
  const form = useForm({
    initialValues: editingItem || {
      name: "",
      displayName: "",
      teamId: "",
    },
    validate: {
      name: (value) =>
        value?.trim().length ? null : translations("Cannot be empty"),
      displayName: (value) =>
        value?.trim().length ? null : translations("Cannot be empty"),
      teamId: (value) =>
        value?.trim().length ? null : translations("select a team"),
    },
  });

  const createMenuMutation = useCreateMenuMutation(
    selectedTeamId,
    close,
    () => {
      form.reset();
    },
  );
  const updateMenuMutation = useUpdateMenuMutation(
    selectedTeamId,
    () => {
      close();
    },
    () => {},
  );

  useEffect(() => {
    if (editingItem) {
      form.setValues(editingItem);
    } else {
      form.reset();
    }
  }, [editingItem]);

  const onSubmit = (values: typeof form.values) => {
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
      title={
        editingItem ? translations("Edit Menu") : translations("Create Menu")
      }
      centered
      onSubmit={form.onSubmit(onSubmit)}
      buttonTitle={
        editingItem ? translations("Save Menu") : translations("Create Menu")
      }
    >
      <LoadingOverlay
        visible={createMenuMutation.isPending || updateMenuMutation.isPending}
        zIndex={1000}
        overlayProps={{ radius: "sm", blur: 2 }}
        loaderProps={{ type: "bars" }}
      />
      <Title order={3}>{translations("General Info")}</Title>
      <Stack>
        <TeamSelector
          placeholder={translations("Select Team")}
          label=""
          allowDeselect={false}
          value={form?.getInputProps("teamId")?.value || ""}
          {...form.getInputProps("teamId")}
          styles={{
            input: {
              width: "100%",
            },
          }}
        />
        <ContainedTextField
          label={translations("Menu Name")}
          placeholder={translations("Menu 1")}
          withAsterisk
          {...form.getInputProps("name")}
        />
        <ContainedTextField
          label={translations("Display Name")}
          placeholder={translations("Hotel Name")}
          withAsterisk
          {...form.getInputProps("displayName")}
        />
      </Stack>
    </FormModalLayout>
  );
}
