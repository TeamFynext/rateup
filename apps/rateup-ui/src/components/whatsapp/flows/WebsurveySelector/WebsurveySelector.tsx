import type { SelectProps } from "@mantine/core";
import { Skeleton } from "@mantine/core";

import { useSurveys } from "@/backend/surveys/surveys.query";
import { SurveyType } from "@/types/enums.ts";

import { ContainedSelection } from "../../../input/ContainedInput/ContainedInput.tsx";

interface WebsurveySelectorProps extends SelectProps {
  onChange?: (flowId: string) => void;
  onlyPublished?: boolean;
  form: any;
  carousel?: string;
  index: number;
}

export function WebsurveySelector({
  onlyPublished = false,
  form,
  carousel,
  index,
  ...props
}: Readonly<WebsurveySelectorProps>) {
  const { isPending, data } = useSurveys();

  if (isPending || !data) {
    return <Skeleton h={46} mt={"sm"} w={50} />;
  }

  const filteredWebSurvey = Array.isArray(data)
    ? onlyPublished
      ? data.filter((survey) => survey.isPublished && survey.type === SurveyType.Web)
      : data.filter((survey) => survey.type === SurveyType.Web)
    : [];

  const selectOptions = filteredWebSurvey.map((survey) => ({
    value: survey.teams?.[0]?.shortUrlId
      ? `${import.meta.env.VITE_FRONTEND_URL}/ws/?:${survey?.teams?.[0]?.shortUrlId}`
      : `${import.meta.env.VITE_FRONTEND_URL}/public/survey/?:error${Math.floor(100000 + Math.random() * 900000).toString()}`,
    label: survey?.title,
  }));

  const handleChange = (url) => {
    const arr = url?.split("?");
    if (carousel) {
      form.setFieldValue(`${carousel}.url`, `${arr?.[0]}{{1}}`);
      form.setFieldValue(`${carousel}.example`, [arr?.[1]]);
    } else {
      form.setFieldValue(`buttons.${index}.url`, `${arr?.[0]}{{1}}`);
      form.setFieldValue(`buttons.${index}.example`, [arr?.[1]]);
    }
  };
  let value = "";
  if (carousel) {
    const fields = carousel.split(".");
    const button = fields.reduce((acc, key) => acc?.[key], form.values);
    value = button.url?.replace("{{1}}", `?${button.example}`);
  } else {
    value = form.values.buttons[index].url?.replace(
      "{{1}}",
      `?${form.values.buttons[index].example}`,
    );
  }
  return (
    <ContainedSelection
      data={selectOptions}
      placeholder="Select websurvey"
      label="Websurvey"
      allowDeselect={false}
      value={value}
      onChange={handleChange}
      {...props}
    />
  );
}
