import { Box, Button, Modal, TextInput } from "@mantine/core";
import styles from "./CreateLandingPageModal.module.css";
import { useForm } from "@mantine/form";
import { useCallback, useRef } from "react";
import {
  useCreateLandingPageMutation,
  useUpdateLandingPageMutation,
} from "../../../backend/landingPage/landingPage.query";

function CreateLandingPageModal({
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
          : "Name should be alphanumeric, length sould be greater than 2 characters",
    },
  });

  const createLandingPageMutation = useCreateLandingPageMutation();
  const updateLandingPageMutation = useUpdateLandingPageMutation(shortUrlId);

  const formSubmitBtnRef = useRef(null);

  const handleCreateLandingPageFormSubmit = useCallback(async (values) => {
    await createLandingPageMutation.mutateAsync(values);
    form.reset();
    onClose();
  }, []);

  const handleUpdateLandingPageFormSubmit = useCallback(async (values) => {
    const name = values.name;
    await updateLandingPageMutation.mutateAsync({ shortUrlId, name });
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
      title={
        mode === "create" ? "Create LandingPage" : "Edit Landing Page Name"
      }
      centered
      classNames={{
        header: styles["modal-header"],
        body: styles["modal-body"],
      }}
    >
      <Box className={styles["modal-content-container"]}>
        <form
          className={styles["create-landingPage-form"]}
          onSubmit={
            mode === "create"
              ? form.onSubmit(handleCreateLandingPageFormSubmit)
              : form.onSubmit(handleUpdateLandingPageFormSubmit)
          }
        >
          <TextInput
            label="Name"
            placeholder="Name of Landing Page"
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
      <Box className={styles["cancel-save-btns-container"]}>
        <Button onClick={handleCancelBtnClick} className={styles["cancel-btn"]}>
          Cancel
        </Button>
        <Button onClick={handleCreateLinkBtnClick}>
          {mode === "create" ? "Create" : "Save changes"}
        </Button>
      </Box>
    </Modal>
  );
}

export default CreateLandingPageModal;
