"use client";

import React, { useCallback, useEffect, useRef } from "react";

import { Box, Button, Modal, TextInput, Tooltip } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { IconPlus } from "@tabler/icons-react";
import { useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { useCreateNewThemeMutation } from "@/backend/surveyTheme/surveyTheme.query";
import modalStyles from "@/styles/commonCssModules/modal.module.css";

import styles from "./ThemeSelector.module.css";

function CreateNewThemeModal({ setThemeSelectorState, surveyThemeDispatch }) {
  const params = useParams({
    strict: false,
  });
  const surveyId = params.surveyId as string;

  const { t: translations } = useTranslation();
  const [opened, { open, close }] = useDisclosure();

  const form = useForm({
    initialValues: {
      name: "",
    },
    validate: {
      // must start with a letter, can contain underscores, numbers, spaces, length must be 6 or more characters.
      name: (value) =>
        /^[a-zA-Z][a-zA-Z0-9_\s]{0,}$/.test(value)
          ? null
          : translations(
              "Name should be alphanumeric, should start with a letter, length should be greater than 0 characters",
            ),
    },
  });

  const { mutateAsync: createNewThemeMutationAsync } =
    useCreateNewThemeMutation(surveyId);

  const submitBtnRef = useRef(null);

  const handleFormSubmit = useCallback(async ({ name }) => {
    try {
      const themeData = await createNewThemeMutationAsync({ name, surveyId });
      setThemeSelectorState(themeData.id);
      surveyThemeDispatch({
        type: "set-survey-theme",
        payload: themeData.theme,
      });
      close();
    } catch (err) {
      console.log(err);
      close();
    }
  }, []);

  const handleCreateLinkBtnClick = useCallback(() => {
    submitBtnRef?.current.click();
  }, []);

  useEffect(() => {
    if (!opened) form.reset();
  }, [opened]);

  return (
    <>
      <Tooltip label={translations("Create New Theme")}>
        <Button
          className={`${styles["new-theme-btn"]} create-theme-btn`}
          onClick={open}
          rightSection={<IconPlus size={"1.25rem"} color="white" />}
        >
          {translations("Create Theme")}
        </Button>
      </Tooltip>
      <Modal
        title={translations("Create New Theme")}
        opened={opened}
        onClose={close}
        centered
        classNames={{
          header: modalStyles["modal-header"],
          body: modalStyles["modal-body"],
          content: modalStyles["modal-content"],
        }}
      >
        <form onSubmit={form.onSubmit(handleFormSubmit)}>
          <TextInput
            label={translations("Theme Name")}
            placeholder={translations("Enter Theme Name")}
            {...form.getInputProps("name")}
          />
          <Button
            style={{ display: "none" }}
            type="submit"
            ref={submitBtnRef}
          />
        </form>
        <Box className={modalStyles["cancel-save-btns-container"]}>
          <Button onClick={close} className={modalStyles["cancel-btn"]}>
            {translations("Cancel")}
          </Button>
          <Button onClick={handleCreateLinkBtnClick}>Create</Button>
        </Box>
      </Modal>
    </>
  );
}

export default CreateNewThemeModal;
