"use client";

import { useState } from "react";

import { ActionIcon, Badge, Group, Loader, Tooltip } from "@mantine/core";
import { IconPencil, IconTrash, IconTrashX } from "@tabler/icons-react";

import { useDeleteThemeMutation } from "../../../../../backend/surveyTheme/surveyTheme.query";
import styles from "./ThemeSelector.module.css";

function RenderOption({
  option,
  surveyActiveThemeId,
  comboboxHandleChange,
  handleOpenRenameThemeModal,
}) {
  const isDefaultOption = option.label === "Default Theme";

  const { value, activeInAnotherSurvey } = option;
  const isSurveyThemeActive = surveyActiveThemeId === value;

  const [isDeletingTheme, setIsDeletingTheme] = useState(false);

  const deleteThemeMutation = useDeleteThemeMutation();

  const handleDeleteBtnClick = async (e) => {
    e.stopPropagation();
    setIsDeletingTheme(true);
    await deleteThemeMutation.mutateAsync(option.value);
    setIsDeletingTheme(false);
    comboboxHandleChange(surveyActiveThemeId);
  };

  const handleEditBtnClick = async (e) => {
    e.stopPropagation();
    handleOpenRenameThemeModal(option.value);
  };

  return (
    <Group justify="space-between" wrap="nowrap">
      <span className={styles["label-span"]}>{option.label}</span>
      <Group wrap="nowrap" className={styles["action-btns-group-div"]}>
        {!isDefaultOption && (
          <ActionIcon
            onClick={handleEditBtnClick}
            className={`${styles["render-option-btn"]} ${styles["edit-action-btn"]}`}
          >
            <IconPencil size={"1rem"} />
          </ActionIcon>
        )}
        {!isDefaultOption && !isSurveyThemeActive && !isDeletingTheme && (
          <ActionIcon
            className={`${styles["render-option-delete-btn"]} ${styles["render-option-btn"]}`}
            onClick={handleDeleteBtnClick}
            disabled={activeInAnotherSurvey}
          >
            {!activeInAnotherSurvey ? (
              <IconTrash size={"1rem"} />
            ) : (
              <Tooltip label={"Active in another survey"} position="right">
                <IconTrashX size={"1rem"} />
              </Tooltip>
            )}
          </ActionIcon>
        )}
        {!isSurveyThemeActive && isDeletingTheme && (
          <ActionIcon
            className={`${styles["render-option-btn"]} ${styles["loader-btn"]}`}
          >
            <Loader size={"1rem"} className={styles["delete-loader"]} />
          </ActionIcon>
        )}
        {isSurveyThemeActive && (
          <Badge className={styles["active-badge"]}>Active</Badge>
        )}
      </Group>
    </Group>
  );
}

export default RenderOption;
