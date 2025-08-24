import { useEffect, useState } from "react";

import {
  Group,
  LoadingOverlay,
  SimpleGrid,
  Stack,
  Switch,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useTranslations } from "next-intl";

import {
  useCreateMenuCategoryMutation,
  useUpdateMenuCategoryMutation,
} from "@/backend/menu/category/mCategory.query";
import { createCustomTimestamp, formatToCustomTime } from "@/utils/dateTime";

import {
  ContainedTextField,
  ContainedTimeInput,
} from "../input/ContainedInput/ContainedInput";
import FormModalLayout from "../Modal/FormModalLayout";

interface CreateMenuCategoryModalProps {
  readonly opened: boolean;
  readonly close: () => void;
  readonly menuId: string;
  readonly editingItem?: MenuCategory;
}
export function CreateMenuCategoryModal({
  opened,
  close,
  menuId,
  editingItem,
}: CreateMenuCategoryModalProps) {
  const [isCreating, setIsCreating] = useState(false);
  const translations = useTranslations();
  const form = useForm({
    initialValues: editingItem ?? {
      name: "",
      menuId: menuId,
      scheduleEnabled: false,
      startTime: "",
      endTime: "",
    },
    validate: {
      name: (value) => (value.length ? null : translations("Cannot be empty")),
    },
  });

  useEffect(() => {
    if (editingItem) {
      const updatedEditingItem = {
        ...editingItem,
        startTime: formatToCustomTime(editingItem.startTime),
        endTime: formatToCustomTime(editingItem.endTime),
      };
      form.setValues(updatedEditingItem);
    } else {
      form.reset();
    }
    //if form add then infinite loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingItem]);

  const createMenuCategoryMutation = useCreateMenuCategoryMutation(
    menuId,
    () => {
      form.reset();
      close();
      setIsCreating(false);
    },
    () => {
      setIsCreating(false);
    },
  );

  const editMenuCategoryMutation = useUpdateMenuCategoryMutation(
    menuId,
    () => {
      form.reset();
      close();
      setIsCreating(false);
    },
    () => {
      setIsCreating(false);
    },
  );

  const onSubmit = (values: typeof form.values) => {
    setIsCreating(true);
    const formatedData: any = values;
    const processSubmit = async () => {
      if (values?.scheduleEnabled) {
        formatedData.startTime =
          values.startTime && createCustomTimestamp(values.startTime);
        formatedData.endTime =
          values.endTime && createCustomTimestamp(values.endTime);
      } else {
        formatedData.startTime = undefined;
        formatedData.endTime = undefined;
        values.startTime = undefined;
        values.endTime = undefined;
      }

      if (editingItem) {
        editMenuCategoryMutation.mutate({
          categoryId: editingItem.id,
          menuCategory: formatedData,
        });
      } else {
        createMenuCategoryMutation.mutate(formatedData);
      }
      setIsCreating(false);
    };
    processSubmit();
  };

  if (!menuId) {
    return null;
  }
  return (
    <FormModalLayout
      opened={opened}
      onClose={close}
      title={
        editingItem
          ? translations("Edit Category")
          : translations("Create Category")
      }
      centered
      onSubmit={form.onSubmit(onSubmit)}
      buttonTitle={
        editingItem
          ? translations("Save Category")
          : translations("Create Category")
      }
    >
      <Stack>
        <LoadingOverlay
          visible={
            createMenuCategoryMutation.isPending ||
            editMenuCategoryMutation.isPending ||
            isCreating
          }
          zIndex={1000}
          overlayProps={{ radius: "sm", blur: 2 }}
          loaderProps={{ type: "bars" }}
        />
        <Stack>
          <Title order={3} c={"var(--grey-color)"}>
            {translations("Category Details")}
          </Title>
          <ContainedTextField
            label={translations("Name")}
            placeholder={translations("Name")}
            withAsterisk
            {...form.getInputProps("name")}
          />
          <Group>
            <Title order={3} c={"var(--grey-color)"}>
              {translations("Timed Menu")}
            </Title>
            <Switch
              {...form.getInputProps("scheduleEnabled")}
              checked={form?.values?.scheduleEnabled}
            />
          </Group>
          <SimpleGrid cols={2}>
            <ContainedTimeInput
              label={translations("Start Time:")}
              disabled={!form?.values?.scheduleEnabled}
              {...form.getInputProps("startTime")}
            />
            <ContainedTimeInput
              label={translations("End Time:")}
              disabled={!form?.values?.scheduleEnabled}
              {...form.getInputProps("endTime")}
            />
          </SimpleGrid>
        </Stack>
      </Stack>
    </FormModalLayout>
  );
}
