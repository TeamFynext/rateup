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
    <div className="flex flex-col gap-0">
      <div className="flex items-center gap-[2px]">
        <span className="text-xs text-muted-foreground">{label}</span>
        {withAsterisk && <span className="text-xs text-red-500">*</span>}
      </div>
      <div
        className={styles.inputBox}
        style={{ borderColor: error ? "red" : undefined, borderRadius }}
      >
        <PhoneInputWithCountrySelect
          defaultCountry="IN"
          international
          countryCallingCodeEditable={false}
          onChange={onChange}
          className={styles.inputPhone}
          rules={{ required: withAsterisk }}
          {...props}
        />
      </div>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
};

export default PhoneInputWithCountry;
