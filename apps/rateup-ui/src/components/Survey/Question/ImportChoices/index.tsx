import { IconDownload, IconInfoCircle } from "@tabler/icons-react";
import { useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import readXlsxFile from "read-excel-file/browser";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert.tsx";
import { Button } from "@/components/ui/button.tsx";

interface ImportChoicesProps {
  setValue: (name: string, value: any) => void;
  surveyLanguagesArr: string[];
  questionObj: Question;
  handleSave: () => void;
}

function ImportChoices({
  setValue,
  surveyLanguagesArr,
  questionObj,
  handleSave,
}: ImportChoicesProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { t: translations } = useTranslation();

  const areAllSurveyLanguagesColumnsPresent = useCallback(
    (headerRow) => {
      const headerRowArr = headerRow.map((languageStr) => languageStr.toString().toLowerCase());
      return surveyLanguagesArr.every((lang) => headerRowArr.includes(lang.toLowerCase()));
    },
    [surveyLanguagesArr],
  );

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const rows = await readXlsxFile(file);
      const headerRow = rows[0]?.data;

      if (!areAllSurveyLanguagesColumnsPresent(headerRow)) {
        toast.error(translations("Please add all survey languages columns in excel file"));
        if (inputRef.current) inputRef.current.value = "";
        return;
      }

      const choiceStringsSets: Record<string, Set<unknown>> = {};
      const columnLanguageObj: Record<number, string> = {};

      for (const surveyLanguage of surveyLanguagesArr) {
        if (!choiceStringsSets[surveyLanguage]) {
          const newSet = new Set();
          if (questionObj.choices) {
            const existing = questionObj.choices[surveyLanguage]?.map((obj) => obj.value) || [];
            for (const str of existing) newSet.add(str);
          }
          choiceStringsSets[surveyLanguage] = newSet;
        }
        const colIndex = headerRow.findIndex(
          (language) => language.toString().toLowerCase() === surveyLanguage.toLowerCase(),
        );
        if (colIndex >= 0 && !columnLanguageObj[colIndex]) {
          columnLanguageObj[colIndex] = surveyLanguage;
        }
      }

      for (let i = 1; i < rows.length; i++) {
        const rowArr = rows[i]?.data;
        if (!rowArr.includes(null)) {
          for (const key in columnLanguageObj) {
            choiceStringsSets[columnLanguageObj[key]].add(rowArr[key]);
          }
        }
      }

      const sizeSet = new Set(Object.values(choiceStringsSets).map((s) => s.size));
      if (sizeSet.size === 1) {
        const choices: Record<string, { value: unknown }[]> = {};
        for (const language in choiceStringsSets) {
          choices[language] = [...choiceStringsSets[language]].map((choice) => ({ value: choice }));
        }
        setValue("choices", choices);
        handleSave();
      }

      if (inputRef.current) inputRef.current.value = "";
    },
    [questionObj, surveyLanguagesArr, handleSave, setValue],
  );

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium">{translations("Import Choices from Excel File")}</p>

      <div className="flex flex-wrap items-start gap-4">
        <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
          {translations("Choose .xlsx file")}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="hidden"
          onChange={handleFileChange}
        />

        <Alert className="flex-1 min-w-[220px]">
          <IconInfoCircle className="size-4" />
          <AlertDescription className="flex flex-col gap-2">
            <span>
              {translations("Column headings in Excel file should be the selected language key.")}
            </span>
            <a
              href={`${import.meta.env.VITE_CLOUDFRONT_WEB_IMAGES_URL}/File/multiple-choice-questions-choices-demo.xlsx`}
              download
              className="flex w-fit items-center gap-1.5 text-xs font-medium text-primary hover:underline"
            >
              <IconDownload className="size-3.5" stroke={1.5} />
              {translations("Download Demo .xlsx File")}
            </a>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}

export default ImportChoices;
