import { Blockquote, Button, FileButton, Group, NavLink, Stack } from "@mantine/core";
import { IconDownload, IconInfoCircle } from "@tabler/icons-react";
import classNames from "classnames/bind";
import { useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import readXlsxFile from "read-excel-file/browser";
import { toast } from "sonner";

import styles from "./ImportChoices.module.css";

const cx = classNames.bind(styles);

function ImportChoices({ mantineFormObj, surveyLanguagesArr, questionObj, handleSave }) {
  const fileButtonResetRef = useRef<() => void>(null);
  const { t: translations } = useTranslation();
  // checks if excel rows has all surveyLanguages columns.
  const areAllSurveyLanguagesColumnsPresent = useCallback((headerRow) => {
    let result = true;
    const headerRowArr = headerRow.map((languageStr) => languageStr.toString().toLowerCase());
    for (const surveyLanguage of surveyLanguagesArr) {
      if (!headerRowArr.includes(surveyLanguage.toLowerCase())) {
        result = false;
      }
    }
    return result;
  }, []);

  const handleFileButtonChange = useCallback(
    async (file) => {
      if (file) {
        const rows = await readXlsxFile(file);
        const headerRow = rows[0]?.data;
        const areAllSurveyLangsColsPresent = areAllSurveyLanguagesColumnsPresent(headerRow);
        if (!areAllSurveyLangsColsPresent) {
          toast.error(translations("Please add all survey languages columns in excel file"));
          return;
        }
        // Format => { English: Set("choice1", "choice 2") }
        const choiceStringsSets = {};

        // Format => { headerRowColIndex: language }; Example => { 0: "English", 1: "Malayalam" }
        const columnLanguageObj = {};

        for (const surveyLanguage of surveyLanguagesArr) {
          if (!choiceStringsSets[surveyLanguage]) {
            const newSet = new Set();
            if (questionObj.choices) {
              const existingOptionsStrsArr =
                questionObj.choices[surveyLanguage]?.map((obj) => obj.value) || [];
              for (const str of existingOptionsStrsArr) newSet.add(str);
            }
            choiceStringsSets[surveyLanguage] = newSet;
          }
          const surveyLanguageColIndexInHeaderRow = headerRow.findIndex(
            (language) => language.toString().toLowerCase() === surveyLanguage.toLowerCase(),
          );
          if (
            surveyLanguageColIndexInHeaderRow >= 0 &&
            !columnLanguageObj[surveyLanguageColIndexInHeaderRow]
          ) {
            columnLanguageObj[surveyLanguageColIndexInHeaderRow] = surveyLanguage;
          }
        }
        for (let i = 1; i < rows.length; i++) {
          const rowArr = rows[i]?.data;
          if (!rowArr.includes(null)) {
            for (const key in columnLanguageObj) {
              const surveyLanguage = columnLanguageObj[key];
              const choiceStrsSet = choiceStringsSets[surveyLanguage];
              choiceStrsSet.add(rowArr[key]);
            }
          }
        }

        // Set to check if all language Sets have same size.
        const sizeSet = new Set();
        for (const language in choiceStringsSets) {
          const languageSet = choiceStringsSets[language];
          sizeSet.add(languageSet.size);
        }

        // means all languages have same number of options/choices.
        if (sizeSet.size === 1) {
          const choices = {};
          for (const language in choiceStringsSets) {
            const languageSet = choiceStringsSets[language];
            const currentLanguageChoices = [];
            for (const choice of languageSet) {
              currentLanguageChoices.push({ value: choice });
            }
            choices[language] = currentLanguageChoices;
          }
          mantineFormObj.setFieldValue("choices", choices);
          handleSave();
        }
      }

      fileButtonResetRef.current?.();
    },
    [questionObj, surveyLanguagesArr, handleSave, mantineFormObj],
  );

  return (
    <Stack className={cx("import-choices-root-div")}>
      <p>{translations("Import Choices from Excel File")}</p>
      <Group gap={"1.5rem"}>
        <FileButton
          resetRef={fileButtonResetRef}
          accept="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={handleFileButtonChange}
        >
          {(props) => <Button {...props}>Choose .xlsx file</Button>}
        </FileButton>
        <Stack className={cx("blockquote-container")}>
          <Blockquote icon={<IconInfoCircle />} iconSize={"1.25rem"}>
            <span>
              {translations("Column headings in Excel file should be the selected language key.")}
            </span>
            <NavLink
              href={`${import.meta.env.VITE_CLOUDFRONT_WEB_IMAGES_URL}/File/multiple-choice-questions-choices-demo.xlsx`}
              label={translations("Download Demo .xlsx File")}
              leftSection={<IconDownload size="1rem" stroke={1.5} />}
              download
              active
              style={{ borderRadius: "4px" }}
            />
          </Blockquote>
        </Stack>
      </Group>
    </Stack>
  );
}

export default ImportChoices;
