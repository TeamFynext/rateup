import { Box, Button, Modal, MultiSelect, TextInput } from "@mantine/core";
import styles from "./CreateFlowModal.module.css";
import { flowsCategories } from "../constants";
import { useForm } from "@mantine/form";
import { useCallback } from "react";

function CreateFlowModal({ opened, onClose }) {
  const form = useForm({
    initialValues: {
      name: "",
      categories: [],
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

  const handleSubmitBtnClick = () => {
    console.log(form.values);
    return;
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
      </Box>

      <Box className={styles["create-flow-modal-footer"]}>
        <Button variant="default" onClick={handleModalClose}>
          Cancel
        </Button>
        <Button onClick={handleSubmitBtnClick}>Submit</Button>
      </Box>
    </Modal>
  );
}

export default CreateFlowModal;
