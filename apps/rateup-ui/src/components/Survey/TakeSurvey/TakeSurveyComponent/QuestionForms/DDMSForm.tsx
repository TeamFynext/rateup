import { useContext, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { InlineMultiSelect } from "@/components/ui/inline-multi-select.tsx";
import { CurrentResponsesContext } from "@/context/ResponseContext.ts";
import SelectedLanguageContext from "@/context/SelectedLanguage.ts";
import { SelectedQContext } from "@/context/SelectedQ.ts";
import { sampleChoices } from "@/utils/constants/forms.ts";

interface MCQFormProps {
  previewChoices?: Record<string, Array<Choice>>;
}

export function DDMSForm({ previewChoices }: MCQFormProps) {
  const { selectedQ } = useContext(SelectedQContext);
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const choices = selectedQ?.choices[selectedLanguage];

  const { response, updateResponse } = useContext(CurrentResponsesContext);

  const [selectedOp, setSelectedOp] = useState<string[]>([]);
  const options = selectedQ
    ? choices
    : previewChoices?.[selectedLanguage]
      ? previewChoices?.[selectedLanguage]
      : sampleChoices;

  const data = options?.map((op) => op?.value);
  const comboboxOptions = useMemo(
    () => data?.map((value) => ({ label: value, value })) ?? [],
    [data],
  );
  const { t: translations } = useTranslation();
  useEffect(() => {
    if (response) {
      setSelectedOp(response?.map((r) => r?.value));
    }
  }, [response]);

  const handleSelectedOp = (values: string[]) => {
    setSelectedOp(values);
    const res = values?.map((val) => options?.find((op) => op?.value === val));
    updateResponse(res);
  };

  return (
    <div className="flex flex-col gap-2">
      <InlineMultiSelect
        options={comboboxOptions}
        value={selectedOp}
        onValueChange={handleSelectedOp}
        placeholder={translations("Select one or more / type in to search")}
      />
    </div>
  );
}
