import { useCallback, useRef } from "react";

import { Box, Button, Modal, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useTranslations } from "next-intl";

import {
  useCreateLandingPageMutation,
  useUpdateLandingPageMutation,
} from "../../../backend/landingPage/landingPage.query";
import modalStyles from "../../../styles/commonCssModules/modal.module.css";
import styles from "./CreateLandingPageModal.module.css";

function CreateLandingPageModal({
  opened,
  onClose,
  mode,
  shortUrlId,
  initialName,
}) {
  const translations = useTranslations();
  const form = useForm({
    initialValues: {
      name: initialName || "",
    },
    validate: {
      // must start with a letter, can contain underscores, numbers, spaces, length must be 3 or more characters.
      name: (value) =>
        /^[a-zA-Z][a-zA-Z0-9_\s]{2,}$/.test(value)
          ? null
          : translations(
              "Name should be alphanumeric, length should be greater than 2 characters",
            ),
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
        mode === "create"
          ? translations("Create LandingPage")
          : translations("Rename Landing Page")
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
          className={styles["create-landingPage-form"]}
          onSubmit={
            mode === "create"
              ? form.onSubmit(handleCreateLandingPageFormSubmit)
              : form.onSubmit(handleUpdateLandingPageFormSubmit)
          }
        >
          <TextInput
            className={styles["name-text-input"]}
            label={translations("Name")}
            placeholder={translations("Enter name of Landing Page")}
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
          {translations("Cancel")}
        </Button>
        <Button onClick={handleCreateLinkBtnClick}>
          {mode === "create"
            ? translations("Create")
            : translations("Save changes")}
        </Button>
      </Box>
    </Modal>
  );
}

export default CreateLandingPageModal;
