import { ActionIcon, Badge, Group, Loader, Tooltip } from "@mantine/core";
import { IconTrash, IconTrashX } from "@tabler/icons-react";
import styles from "./ThemeSelector.module.css";
import { useDeleteThemeMutation } from "../../../../../backend/surveyTheme/surveyTheme.query";
import { useState } from "react";

function RenderOption({ option, surveyActiveThemeId, comboboxHandleChange }) {
  console.log(surveyActiveThemeId, option, "From renderoption");
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

  return (
    <Group justify="space-between">
      <span className={styles["label-span"]}>{option.label}</span>
      {!isDefaultOption && !isSurveyThemeActive && !isDeletingTheme && (
        <ActionIcon
          className={styles["render-option-delete-btn"]}
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
      {!isSurveyThemeActive && isDeletingTheme && <Loader size={"0.875rem"} />}
      {isSurveyThemeActive && (
        <Badge className={styles["active-badge"]}>Active</Badge>
      )}
    </Group>
  );
}

export default RenderOption;
