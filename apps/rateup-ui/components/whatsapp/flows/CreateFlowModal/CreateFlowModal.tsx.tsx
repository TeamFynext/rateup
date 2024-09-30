import { useCallback } from "react";

import { Box, Button, Modal, MultiSelect, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { getHotkeyHandler } from "@mantine/hooks";

import useTranslations from "@/dictionaries/useTranslation";

import { useCreateFlowMutation } from "../../../../backend/whatsapp/flow/flow.query";
import { SAVE_HOTKEY } from "../../../../utils/constants";
import {
  ContainedMultiSelect,
  ContainedTextField,
} from "../../../input/ContainedInput/ContainedInput";
import { TeamSelector } from "../../../input/TeamSelector";
import { flowsCategories } from "../constants";
import styles from "./CreateFlowModal.module.css";

function CreateFlowModal({ opened, onClose }) {
  const form = useForm({
    initialValues: {
      name: "",
      categories: [],
      teamId: "",
    },
    validate: {
      name: (value) => (value.length === 0 ? "Please enter a name" : null),
      categories: (value) =>
        value.length === 0 ? "Please select a category" : null,
    },
  });
  const { translations } = useTranslations();
  const handleModalClose = useCallback(() => {
    form.reset();
    onClose();
  }, [form]);

  const createFlowMutation = useCreateFlowMutation();
  const handleSubmitBtnClick = () => {
    createFlowMutation.mutate(
      {
        name: form.values.name,
        categories: form.values.categories,
        teamIds: [form.values.teamId],
      },
      {
        onSuccess: () => {
          handleModalClose();
        },
        onError: (error) => {
          console.error(error);
        },
      },
    );
  };

  return (
    <Modal
      opened={opened}
      onClose={handleModalClose}
      title={translations["Create Flow"]}
      centered
      classNames={{
        title: styles["modal-title"],
        close: styles["modal-close-button"],
      }}
      onKeyDown={getHotkeyHandler([
        [
          SAVE_HOTKEY,
          (event: any) => form.onSubmit(handleSubmitBtnClick)(event),
        ],
      ])}
    >
      <Box className={styles["create-flow-modal-body"]}>
        <ContainedTextField
          label={translations["Name"]}
          placeholder={translations["Enter Name"]}
          {...form.getInputProps("name")}
        />
        <ContainedMultiSelect
          label={translations["Categories"]}
          placeholder={translations["Select Categories"]}
          data={flowsCategories}
          {...form.getInputProps("categories")}
        />
        <TeamSelector // TODO: add multi select
          label={translations["Team"]}
          value={form.values.teamId}
          onChange={(value) => form.setFieldValue("teamId", value)}
        />
      </Box>

      <Box className={styles["create-flow-modal-footer"]}>
        <Button variant="default" onClick={handleModalClose}>
          {translations["Cancel"]}
        </Button>
        <Button
          loading={createFlowMutation.isPending}
          onClick={handleSubmitBtnClick}
        >
          {translations["Submit"]}
        </Button>
      </Box>
    </Modal>
  );
}

export default CreateFlowModal;
