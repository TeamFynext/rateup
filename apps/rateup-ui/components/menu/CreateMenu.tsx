import {
  useCreateMenuMutation,
  useUpdateMenuMutation,
} from "../../backend/menu/menu.query";
import { useContext, useEffect } from "react";
import { LoadingOverlay, Stack, Title } from "@mantine/core";
import { useForm } from "@mantine/form";
import SelectedTeamContext from "../../context/SelectedTeam";
import FormModalLayout from "../Modal/FormModalLayout";
import { ContainedTextField } from "../input/ContainedInput/ContainedInput";
import { TeamSelector } from "../input/TeamSelector";

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
      title={editingItem ? "Edit Menu" : "Create Menu"}
      centered
      onSubmit={form.onSubmit(onSubmit)}
      buttonTitle={editingItem ? "Save Menu" : "Create Menu"}
    >
      <LoadingOverlay
        visible={createMenuMutation.isPending || updateMenuMutation.isPending}
        zIndex={1000}
        overlayProps={{ radius: "sm", blur: 2 }}
        loaderProps={{ type: "bars" }}
      />
      <Title order={3}>General Info</Title>
      <Stack>
        <TeamSelector
          placeholder="Select Team"
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
          label="Menu Name"
          placeholder="Menu 1"
          withAsterisk
          {...form.getInputProps("name")}
        />
        <ContainedTextField
          label="Display Name"
          placeholder="Hotel Name"
          withAsterisk
          {...form.getInputProps("displayName")}
        />
      </Stack>
    </FormModalLayout>
  );
}
