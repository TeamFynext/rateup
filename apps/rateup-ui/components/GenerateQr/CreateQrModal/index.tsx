import { useForm } from "@mantine/form";
import { useCallback, useRef } from "react";
import { Box, Button, Modal, TextInput } from "@mantine/core";
import modalStyles from "styles/commonCssModules/modal.module.css";
import styles from "./CreateQrModal.module.css";

function CreateQrModal({ opened, onClose, mode, shortId, initialName }) {
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

  // const createShortUrlMutation = useCreateShortUrlMutation();
  // const updateShortUrlMutation = useUpdateShortUrlMutation(shortUrlId);

  const createQrMutation = () => {};
  const updateQrMutation = (shortUrlId) => {};

  const formSubmitBtnRef = useRef(null);

  const handleCreateQrFormSubmit = useCallback(async (values) => {
    // await createShortUrlMutation.mutateAsync(values);
    form.reset();
    onClose();
  }, []);

  const handleUpdateQrFormSubmit = useCallback(async (values) => {
    const name = values.name;
    // await updateShortUrlMutation.mutateAsync({ shortUrlId, name });
    form.reset();
    onClose();
  }, []);

  const handleCreateBtnClick = useCallback(() => {
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
      title={mode === "create" ? "Create QR" : "Rename QR"}
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
          className={styles["create-qr-form"]}
          onSubmit={
            mode === "create"
              ? form.onSubmit(handleCreateQrFormSubmit)
              : form.onSubmit(handleUpdateQrFormSubmit)
          }
        >
          <TextInput
            className={styles["name-text-input"]}
            label="Name"
            placeholder="Enter name of Short Url"
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
        <Button onClick={handleCreateBtnClick}>
          {mode === "create" ? "Create" : "Save changes"}
        </Button>
      </Box>
    </Modal>
  );
}

export default CreateQrModal;
