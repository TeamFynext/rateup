import { SelectProps, Skeleton } from "@mantine/core";
import { ContainedSelection } from "../../../input/ContainedInput/ContainedInput";
import { useSurveys } from "../../../../backend/surveys/surveys.query";

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
}: WebsurveySelectorProps) {
  const { isPending, data } = useSurveys();

  if (isPending || !data) {
    return <Skeleton h={46} mt={"sm"} />;
  }

  const filteredWebSurvey = Array.isArray(data)
    ? onlyPublished
      ? data.filter((survey) => survey.isPublished)
      : data
    : [];

  const selectOptions = filteredWebSurvey.map((survey) => ({
    value: survey.teams?.[0]?.shortUrlId
      ? `${process.env.NEXT_PUBLIC_FRONTEND_URL}/ws/${survey.teams?.[0]?.shortUrlId}?phone={{1}}`
      : `${process.env.NEXT_PUBLIC_FRONTEND_URL}/public/survey/${survey.teams?.[0]?.mapId}?phone={{1}}`,
    label: survey?.title,
  }));

  const handleChange = (url) => {
    form.setFieldValue(`buttons.${index}.url`, url);
    form.insertListItem(
      `buttons.${index}.example`,
      Math.floor(1000000000 + Math.random() * 9000000000),
    );
  };
  return (
    <ContainedSelection
      data={selectOptions}
      placeholder="Select websurvey"
      label="Websurvey"
      allowDeselect={false}
      {...form.getInputProps(`buttons.${index}.url`)}
      onChange={handleChange}
      {...props}
    />
  );
}
