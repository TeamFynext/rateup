"use client";

import { useCallback, useRef } from "react";

import { Box, Button, Modal, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import {
  useCreateQrMutation,
  useUpdateQrMutation,
} from "backend/generateQr/generateQr.query";
import { useTranslations } from "next-intl";
import modalStyles from "styles/commonCssModules/modal.module.css";

import styles from "./CreateQrModal.module.css";

function CreateQrModal({ opened, onClose, mode, shortUrlId, initialName }) {
  const translations = useTranslations();
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
          : translations(
              "Name should be alphanumeric, length should be greater than 2 characters",
            ),
      url: (value) => {
        if (mode === "create") {
          if (value) {
            let url;
            try {
              url = new URL(value);
            } catch (_) {
              return translations("Please enter a valid url");
            }
          } else {
            return translations("URL is required");
          }
        }
      },
    },
  });

  const createQrMutation = useCreateQrMutation();
  const updateQrMutation = useUpdateQrMutation(shortUrlId);

  const formSubmitBtnRef = useRef(null);

  const handleCreateQrFormSubmit = useCallback(async (values) => {
    await createQrMutation.mutateAsync({
      name: values.name,
      link: values.url,
    });
    form.reset();
    onClose();
  }, []);

  const handleUpdateQrFormSubmit = useCallback(
    async (values) => {
      const name = values.name;
      await updateQrMutation.mutateAsync({
        shortUrlId: shortUrlId,
        name,
      });
      form.reset();
      onClose();
    },
    [shortUrlId],
  );

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
      title={
        mode === "create"
          ? translations("Create QR")
          : translations("Rename QR")
      }
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
            label={translations("Name")}
            placeholder={translations("Enter name of QR")}
            onClick={(e) => e.stopPropagation()}
            {...form.getInputProps("name")}
            withAsterisk
          />
          {mode === "create" && (
            <TextInput
              className={styles["url-text-input"]}
              label={translations("URL")}
              placeholder={translations("Enter URL")}
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
          {translations("Cancel")}
        </Button>
        <Button onClick={handleCreateBtnClick}>
          {mode === "create"
            ? translations("Create")
            : translations("Save changes")}
        </Button>
      </Box>
    </Modal>
  );
}

export default CreateQrModal;
