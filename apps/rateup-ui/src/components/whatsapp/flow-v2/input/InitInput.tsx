import {
  ContainedSelection,
  ContainedTextField,
} from "@/components/input/ContainedInput/ContainedInput.tsx";

const InitInput = (props) => {
  return props?.dataSource?.length > 0 ? (
    <ContainedSelection
      label={props.label}
      data={props.dataSource?.map((data) => ({
        value: data.id,
        label: data.title,
      }))}
      onChange={props.onChange}
      placeholder={props.placeholder}
    />
  ) : (
    <ContainedTextField
      label={props.label}
      onChange={props.onChange}
      placeholder={props.placeholder}
    />
  );
};

export default InitInput;
