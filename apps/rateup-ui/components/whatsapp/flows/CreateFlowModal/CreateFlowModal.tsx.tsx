import { Box, Button, Modal, MultiSelect, TextInput } from "@mantine/core";
import styles from "./CreateFlowModal.module.css";
import { flowsCategories } from "../constants";
import { useForm } from "@mantine/form";
import { useCallback } from "react";
import { useCreateFlowMutation } from "../../../../backend/whatsapp/flow/flow.query";
import { TeamSelector } from "../../../input/TeamSelector";

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
      title={"Create Flow"}
      centered
      classNames={{
        title: styles["modal-title"],
        close: styles["modal-close-button"],
      }}
    >
      <Box className={styles["create-flow-modal-body"]}>
        {/*rebase marke */}
        <TextInput
          label="Name"
          placeholder="Enter Name"
          classNames={{
            label: styles["input-element-label"],
          }}
          {...form.getInputProps("name")}
        />

        <MultiSelect
          label="Categories"
          placeholder="Select Categories"
          data={flowsCategories}
          classNames={{
            label: styles["input-element-label"],
          }}
          {...form.getInputProps("categories")}
        />
        <TeamSelector // TODO: add multi select
          label="Team"
          value={form.values.teamId}
          onChange={(value) => form.setFieldValue("teamId", value)}
        />
      </Box>

      <Box className={styles["create-flow-modal-footer"]}>
        <Button variant="default" onClick={handleModalClose}>
          Cancel
        </Button>
        <Button
          loading={createFlowMutation.isPending}
          onClick={handleSubmitBtnClick}
        >
          Submit
        </Button>
      </Box>
    </Modal>
  );
}

export default CreateFlowModal;
