import { useCallback, useRef } from "react";

import { Box, Button, Modal, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";

import {
  useCreateLinktreeMutation,
  useUpdateLinktreeMutation,
} from "../../../backend/linktree/linktree.query";
import modalStyles from "../../../styles/commonCssModules/modal.module.css";
import styles from "./CreateLinktreeModal.module.css";

function CreateLinktreeModal({
  opened,
  onClose,
  mode,
  shortUrlId,
  initialName,
}) {
  const form = useForm({
    initialValues: {
      name: initialName || "",
    },
    validate: {
      // must start with a letter, can contain underscores, numbers, spaces, length must be 3 or more characters.
      name: (value) =>
        /^[a-zA-Z][a-zA-Z0-9_\s]{2,}$/.test(value)
          ? null
          : "Name should be alphanumeric, length should be greater than 2 characters",
    },
  });

  const createLinktreeMutation = useCreateLinktreeMutation();
  const updateLinktreeMutation = useUpdateLinktreeMutation(shortUrlId);

  const formSubmitBtnRef = useRef(null);

  const handleCreateLinktreeFormSubmit = useCallback(async (values) => {
    await createLinktreeMutation.mutateAsync(values);
    form.reset();
    onClose();
  }, []);

  const handleUpdateLinktreeFormSubmit = useCallback(async (values) => {
    const name = values.name;
    await updateLinktreeMutation.mutateAsync({ shortUrlId, name });
    form.reset();
    onClose();
  }, []);

  const handleCreateLinkBtnClick = useCallback(() => {
    formSubmitBtnRef?.current.click();
  }, []);

  const handleCancelBtnClick = useCallback(() => {
    onClose();
    form.reset();
  }, [form]);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={mode === "create" ? "Create Linktree" : "Rename Linktree"}
      centered
      classNames={{
        header: modalStyles["modal-header"],
        body: modalStyles["modal-body"],
        content: modalStyles["modal-content"],
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <Box className={modalStyles["modal-content-container"]}>
        <form
          className={styles["create-linktree-form"]}
          onSubmit={
            mode === "create"
              ? form.onSubmit(handleCreateLinktreeFormSubmit)
              : form.onSubmit(handleUpdateLinktreeFormSubmit)
          }
        >
          <TextInput
            className={styles["name-text-input"]}
            label="Name"
            placeholder="Enter name of Landing Page"
            onClick={(e) => e.stopPropagation()}
            {...form.getInputProps("name")}
          />
          <Button
            style={{ display: "none" }}
            type="submit"
            ref={formSubmitBtnRef}
          />
        </form>
      </Box>
      <Box className={modalStyles["cancel-save-btns-container"]}>
        <Button
          onClick={handleCancelBtnClick}
          className={modalStyles["cancel-btn"]}
        >
          Cancel
        </Button>
        <Button onClick={handleCreateLinkBtnClick}>
          {mode === "create" ? "Create" : "Save changes"}
        </Button>
      </Box>
    </Modal>
  );
}

export default CreateLinktreeModal;
