"use client";

import React, { useEffect } from "react";

import {
  ActionIcon,
  Box,
  Button,
  ColorInput,
  Flex,
  Stack,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { IconCirclePlus, IconUserPlus, IconX } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { useUpdateContactTagsMutation } from "@/backend/whatsapp/settings/waSettings.query";

import FormModalLayout from "../Modal/FormModalLayout";

const AddLabelSettings = ({ cTags, ...props }) => {
  const [opened, { toggle, close }] = useDisclosure();

  const t = useTranslations();
  const form = useForm({
    initialValues: {
      contactTags: [],
      contactGroupTags: [],
      inboxLabels: [],
    },
  });
  const updateContactTagsMutation = useUpdateContactTagsMutation();

  useEffect(() => {
    form.setValues({
      inboxLabels: cTags?.inboxLabels || [],
      contactTags: [],
      contactGroupTags: [],
    });
  }, []);

  const handleSubmit = () => {
    const values = form.getValues();
    updateContactTagsMutation.mutate(
      {
        tags: values.contactTags,
        groupTags: values.contactGroupTags,
        inboxLabels: values.inboxLabels,
      },
      {
        onSettled() {
          close();
        },
      },
    );
  };

  return (
    <Stack>
      <ActionIcon onClick={toggle} variant="transparent">
        <IconCirclePlus {...props} />
      </ActionIcon>
      <FormModalLayout
        opened={opened}
        title={t("Update Labels")}
        onClose={() => {
          form.setValues({
            inboxLabels: cTags?.inboxLabels,
          });
          close();
        }}
        centered
        noCustomHeader
        size="lg"
        onSubmit={handleSubmit}
        buttonTitle="Save"
      >
        <LabelSettings form={form} t={t} />
      </FormModalLayout>
    </Stack>
  );
};

export const LabelSettings = ({ t, form }) => {
  return (
    <Box mb="md">
      <Title size="h5" mb="xs">
        {t("Inbox labels")}
      </Title>
      <Stack gap="xs">
        {form.values?.inboxLabels?.map((tag, index) => (
          <Flex key={index} align="center" gap="sm">
            <TextInput
              {...form.getInputProps(`inboxLabels.${index}.name`)}
              placeholder={t("label name")}
              style={{ flex: 1 }}
            />
            <ColorInput
              {...form.getInputProps(`inboxLabels.${index}.color`)}
              swatches={[
                "#2e2e2e",
                "#868e96",
                "#fa5252",
                "#e64980",
                "#be4bdb",
                "#7950f2",
                "#4c6ef5",
                "#228be6",
                "#15aabf",
                "#12b886",
                "#40c057",
                "#82c91e",
                "#fab005",
                "#fd7e14",
              ]}
            />
            <ActionIcon
              variant="light"
              color="red"
              onClick={() => {
                form.removeListItem("inboxLabels", index);
              }}
            >
              <IconX size={16} />
            </ActionIcon>
          </Flex>
        ))}
        <Button
          variant="outline"
          leftSection={<IconUserPlus size={16} />}
          onClick={() =>
            form.insertListItem("inboxLabels", {
              name: "",
              color: "#3B82F6",
            })
          }
        >
          {t("Add New Inbox Label")}
        </Button>
        {form.errors.inboxLabels && (
          <Box c="red" fz="sm">
            {form.errors.inboxLabels}
          </Box>
        )}
      </Stack>
    </Box>
  );
};

export default AddLabelSettings;
