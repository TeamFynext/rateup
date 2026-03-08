"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Box, Button, Modal, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";

import modalStyles from "@/styles/commonCssModules/modal.module.css";

import { useRenameSurveyThemeMutation } from "../../../../../backend/surveyTheme/surveyTheme.query";

function RenameThemeModal({ opened, onClose, themeId, oldName }) {
  const form = useForm({
    initialValues: {
      name: oldName,
    },
    validate: {
      // must start with a letter, can contain underscores, numbers, spaces, length must be 6 or more characters.
      name: (value) =>
        /^[a-zA-Z][a-zA-Z0-9_\s]{5,}$/.test(value)
          ? null
          : "Name should be alphanumeric, should start with a letter, length should be greater than 5 characters",
    },
  });

  const [isRenaming, setIsRenaming] = useState(false);

  const { mutateAsync: renameThemeMutationAsync } =
    useRenameSurveyThemeMutation();

  const submitBtnRef = useRef(null);

  const handleFormSubmit = useCallback(
    async ({ name }) => {
      await setIsRenaming(true);
      if (name && themeId) {
        try {
          await renameThemeMutationAsync({
            surveyThemeId: themeId,
            body: { name },
          });
          onClose();
        } catch (err) {
          console.log(err);
        }
      }
      await setIsRenaming(false);
    },
    [themeId],
  );

  const handleCreateLinkBtnClick = useCallback(() => {
    submitBtnRef?.current.click();
  }, []);

  useEffect(() => {
    if (!opened) form.reset();
  }, [opened]);

  return (
    <Modal
      title={"Rename Theme"}
      opened={opened}
      onClose={onClose}
      centered
      classNames={{
        header: modalStyles["modal-header"],
        body: modalStyles["modal-body"],
        content: modalStyles["modal-content"],
      }}
    >
      <form onSubmit={form.onSubmit(handleFormSubmit)}>
        <TextInput
          label="Theme Name"
          placeholder="Enter New Theme Name"
          {...form.getInputProps("name")}
        />
        <Button style={{ display: "none" }} type="submit" ref={submitBtnRef} />
      </form>
      <Box className={modalStyles["cancel-save-btns-container"]}>
        <Button onClick={onClose} className={modalStyles["cancel-btn"]}>
          Cancel
        </Button>
        <Button onClick={handleCreateLinkBtnClick} loading={isRenaming}>
          Save
        </Button>
      </Box>
    </Modal>
  );
}

export default RenameThemeModal;
