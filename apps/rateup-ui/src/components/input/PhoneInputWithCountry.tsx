import { Box, Group, Stack, Text } from "@mantine/core";
import type { DefaultInputComponentProps } from "react-phone-number-input";
import PhoneInputWithCountrySelect from "react-phone-number-input";

import styles from "./InputStyles.module.css";

interface Props extends DefaultInputComponentProps {
  label?: string;
  withAsterisk?: boolean;
  error?: any;
  borderRadius?: string | number;
}
const PhoneInputWithCountry = ({
  label,
  onChange,
  withAsterisk,
  error,
  borderRadius,
  ...props
}: Props) => {
  return (
    <Stack gap={0}>
      <Group gap={2}>
        <Text size="xs" c={"var(--grey-color)"}>
          {label}
        </Text>
        {withAsterisk && (
          <Text size="xs" c={"red"}>
            *
          </Text>
        )}
      </Group>
      <Box className={styles.inputBox} style={{ borderColor: error && "red", borderRadius }}>
        <PhoneInputWithCountrySelect
          defaultCountry="IN"
          international
          countryCallingCodeEditable={false}
          onChange={onChange}
          className={styles.inputPhone}
          rules={{ required: withAsterisk }}
          {...props}
        />
      </Box>
      {error && (
        <Text size="xs" c="red">
          {error}
        </Text>
      )}
    </Stack>
  );
};

export default PhoneInputWithCountry;
