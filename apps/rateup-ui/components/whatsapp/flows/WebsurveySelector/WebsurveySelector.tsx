import { SelectProps, Skeleton } from "@mantine/core";

import { useSurveys } from "../../../../backend/surveys/surveys.query";
import { SurveyType } from "../../../../types/enums";
import { ContainedSelection } from "../../../input/ContainedInput/ContainedInput";

interface WebsurveySelectorProps extends SelectProps {
  value?: string;
  onChange?: (flowId: string) => void;
  onlyPublished?: boolean;
  form: any;
  index: number;
}

export function WebsurveySelector({
  value,
  onChange,
  onlyPublished = false,
  form,
  index,
  ...props
}: Readonly<WebsurveySelectorProps>) {
  const { isPending, data } = useSurveys();

  if (isPending || !data) {
    return <Skeleton h={46} mt={"sm"} w={50} />;
  }

  const filteredWebSurvey = Array.isArray(data)
    ? onlyPublished
      ? data.filter(
          (survey) => survey.isPublished && survey.type === SurveyType.Web,
        )
      : data.filter((survey) => survey.type === SurveyType.Web)
    : [];

  const selectOptions = filteredWebSurvey.map((survey) => ({
    value: survey.teams?.[0]?.shortUrlId
      ? `${process.env.NEXT_PUBLIC_FRONTEND_URL}/ws/?:${survey?.teams?.[0]?.shortUrlId}`
      : `${process.env.NEXT_PUBLIC_FRONTEND_URL}/public/survey/?:error${Math.floor(100000 + Math.random() * 900000).toString()}`,
    label: survey?.title,
  }));

  const handleChange = (url) => {
    let arr = url?.split("?");
    form.setFieldValue(`buttons.${index}.url`, `${arr?.[0]}{{1}}`);
    form.setFieldValue(`buttons.${index}.example`, [arr?.[1]]);
  };
  return (
    <ContainedSelection
      data={selectOptions}
      placeholder="Select websurvey"
      label="Websurvey"
      allowDeselect={false}
      value={form.values.buttons[index].url?.replace(
        "{{1}}",
        `?${form.values.buttons[index].example}`,
      )}
      onChange={handleChange}
      {...props}
    />
  );
}
