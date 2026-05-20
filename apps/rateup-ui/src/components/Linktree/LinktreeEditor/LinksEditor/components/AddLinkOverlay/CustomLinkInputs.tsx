import { TextInput } from "@mantine/core";

function CustomLinkInputs({ form }) {
  return (
    <>
      <TextInput
        label="Link Display name"
        placeholder="Enter Link Display Name"
        {...form.getInputProps("linkDisplayName")}
        withAsterisk
      />

      <TextInput
        label="Link Url"
        placeholder="Enter Url"
        {...form.getInputProps("linkUrl")}
        withAsterisk
      />
    </>
  );
}

export default CustomLinkInputs;
