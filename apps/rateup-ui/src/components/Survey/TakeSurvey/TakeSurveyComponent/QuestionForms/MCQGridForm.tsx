import { useContext, useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { Field, FieldTitle } from "@/components/ui/field.tsx";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.tsx";
import { CurrentResponsesContext } from "@/context/ResponseContext.ts";
import SelectedLanguageContext from "@/context/SelectedLanguage.ts";
import { SelectedQContext } from "@/context/SelectedQ.ts";
import { useSurveyThemeData } from "@/context/SurveyThemeContext.tsx";
import { useMediaQuery } from "@/hooks/use-media-query.ts";
import { sampleChoices } from "@/utils/constants/forms.ts";

import { useSelectedPreview } from "../../../SurveyTheme/SurveyThemeContext.tsx";
import { isLightColor } from "./isLightColor.ts";
import { useThemePrimaryColor } from "./useThemePrimaryColor.ts";

interface MCQGridFormProps {
  features: any;
  previewChoices?: Choice[];
  isPreview?: boolean;
}
const MCQGridForm = ({ features, previewChoices, isPreview }: MCQGridFormProps) => {
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const { selectedQ } = useContext(SelectedQContext);
  const choices =
    selectedQ?.choices?.[selectedLanguage] || previewChoices?.[selectedLanguage] || sampleChoices;
  const questions = features?.[selectedLanguage]?.questions;

  const { response, updateResponse } = useContext(CurrentResponsesContext);

  const tableRef = useRef(null);
  const themePrimaryColor = useThemePrimaryColor();

  const { control } = useForm<Record<string, string>>({
    values: Object.fromEntries(
      (questions ?? []).map((question) => [question, response?.[question]?.value ?? ""]),
    ),
  });

  const handleUpdateResponse = (value, question) => {
    const choice = choices?.find((ch) => ch.value === value);
    updateResponse({ ...response, [question]: choice });
  };

  const selectedPreview = useSelectedPreview();
  const isMobile = useMediaQuery("(max-width: 480px)") || selectedPreview === "mobile";

  const [tableHeight, setTableHeight] = useState<number>(null);
  const [tableWidth, setTableWidth] = useState<number>(null);

  useEffect(() => {
    if (tableRef.current) {
      const height = tableRef.current.clientHeight;
      const width = tableRef.current.clientWidth;
      setTableHeight(height);
      setTableWidth(width);
    }
  }, []);

  if (isMobile)
    return (
      <MCQGridMobileForm
        choices={choices}
        questions={questions}
        handleUpdateResponse={handleUpdateResponse}
        control={control}
        themePrimaryColor={themePrimaryColor}
      />
    );

  const TableComponent = () => (
    <Table className="border-separate border-spacing-0">
      <TableHeader>
        <TableRow>
          <TableHead className="sticky top-0 left-0 z-[3] bg-[#CDCDCD] px-4 py-4" />
          {choices?.map((choice) => (
            <TableHead
              key={choice?.value}
              className="sticky top-0 z-[2] w-[100px] bg-[#CDCDCD] px-4 py-4"
            >
              {choice?.value}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody className="[&_tr]:border-b-0">
        {questions?.map((question) => (
          <TableRow key={question}>
            <TableCell className="sticky top-0 left-0 z-[1] bg-[#E4E6ED] px-4 py-4">
              {question}
            </TableCell>
            {choices?.map((choice) => {
              const isSelected = response?.[question]?.value == choice?.value;
              return (
                <TableCell key={choice?.value} className="px-4 py-4">
                  <Controller
                    name={question}
                    control={control}
                    render={({ field }) => (
                      <RadioGroup
                        value={field.value}
                        onValueChange={(value) => {
                          field.onChange(value);
                          handleUpdateResponse(value, question);
                        }}
                      >
                        <RadioGroupItem
                          value={choice?.value}
                          style={
                            isSelected
                              ? {
                                  backgroundColor: themePrimaryColor,
                                  borderColor: themePrimaryColor,
                                }
                              : { borderColor: themePrimaryColor }
                          }
                        />
                      </RadioGroup>
                    )}
                  />
                </TableCell>
              );
            })}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <div
      className="flex w-full flex-col justify-center"
      style={{ width: isPreview ? 700 : "100%" }}
    >
      {tableHeight > 450 || tableWidth > 900 ? (
        <ScrollArea
          style={{
            height: tableHeight > 450 ? "65vh" : "100%",
            width: isPreview ? 700 : 900,
          }}
        >
          <div ref={tableRef}>
            <TableComponent />
          </div>
        </ScrollArea>
      ) : (
        <div ref={tableRef}>
          <TableComponent />
        </div>
      )}
    </div>
  );
};

interface MCQGridMobileFormProps {
  choices: Choice[];
  questions: string[];
  handleUpdateResponse: (value, question) => void;
  control: ReturnType<typeof useForm<Record<string, string>>>["control"];
  themePrimaryColor: string;
}
const MCQGridMobileForm = ({
  choices,
  questions,
  handleUpdateResponse,
  control,
  themePrimaryColor,
}: MCQGridMobileFormProps) => {
  const { response } = useContext(CurrentResponsesContext);
  const textColor = isLightColor(themePrimaryColor) ? "#000000" : "#FFFFFF";
  const surveyTheme = useSurveyThemeData()?.surveyTheme;
  const titleColor = surveyTheme?.title.styles?.color;

  return (
    <ScrollArea className="max-h-full w-full p-3">
      {questions?.map((question, index) => (
        <Field key={index}>
          <h5 className="text-base font-medium" style={{ color: titleColor || "black" }}>
            {question}
          </h5>
          <Field>
            <Controller
              name={question}
              control={control}
              render={({ field }) => (
                <RadioGroup
                  value={field.value}
                  onValueChange={(value) => {
                    field.onChange(value);
                    handleUpdateResponse(value, question);
                  }}
                >
                  {choices?.map((choice) => {
                    const isSelected = response?.[question]?.value == choice?.value;
                    return (
                      <FieldTitle
                        key={choice?.value as string}
                        className="flex cursor-pointer items-center gap-3 rounded-[5px] p-2"
                        style={{
                          backgroundColor: isSelected ? themePrimaryColor : "transparent",
                          border: `1px solid ${themePrimaryColor}`,
                          color: isSelected ? textColor : themePrimaryColor,
                        }}
                      >
                        <RadioGroupItem
                          value={choice?.value as string}
                          style={{ borderColor: textColor }}
                        />
                        {choice?.value as string}
                      </FieldTitle>
                    );
                  })}
                </RadioGroup>
              )}
            />
          </Field>
          {index + 1 < questions?.length && <Separator className="my-3 bg-[#868e96]" />}
        </Field>
      ))}
    </ScrollArea>
  );
};

export default MCQGridForm;
