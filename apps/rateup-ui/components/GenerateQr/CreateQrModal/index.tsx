import { useForm } from "@mantine/form";
import { useCallback, useRef } from "react";
import { Box, Button, Modal, TextInput } from "@mantine/core";
import modalStyles from "styles/commonCssModules/modal.module.css";
import styles from "./CreateQrModal.module.css";
import { useCreateQrMutation } from "backend/generateQr/generateQr.query";

function CreateQrModal({ opened, onClose, mode, shortId, initialName }) {
  const form = useForm({
    initialValues: {
      name: initialName || "",
      url: "",
    },
    validate: {
      // must start with a letter, can contain underscores, numbers, spaces, length must be 3 or more characters.
      name: (value) =>
        /^[a-zA-Z][a-zA-Z0-9_\s]{2,}$/.test(value)
          ? null
          : "Name should be alphanumeric, length should be greater than 2 characters",
      url: (value) => {
        if (mode === "create") {
          if (value) {
            let url;
            try {
              url = new URL(value);
            } catch (_) {
              return "Please enter a valid url.";
            }
          } else {
            return "URL is required.";
          }
        }
      },
    },
  });

  const createQrMutation = useCreateQrMutation();
  const updateQrMutation = (shortUrlId) => {};

  const formSubmitBtnRef = useRef(null);

  const handleCreateQrFormSubmit = useCallback(async (values) => {
    await createQrMutation.mutateAsync({
      name: values.name,
      link: values.url,
    });
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
            placeholder="Enter name QR"
            onClick={(e) => e.stopPropagation()}
            {...form.getInputProps("name")}
            withAsterisk
          />
          {mode === "create" && (
            <TextInput
              className={styles["url-text-input"]}
              label="URL"
              placeholder="Enter URL"
              onClick={(e) => e.stopPropagation()}
              {...form.getInputProps("url")}
              withAsterisk
            />
          )}
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
