import { ColorPicker } from "@mantine/core";

import { swatches } from "../../SurveyTheme.constants";

interface CustomColorPickerProps {
  value: string;
  onChange: (value: string) => void;
  enableSwatches?: boolean;
}
export default function CustomColorPicker({
  onChange,
  value,
  enableSwatches = true,
}: CustomColorPickerProps) {
  return (
    <ColorPicker
      size="md"
      format="rgba"
      swatches={enableSwatches && swatches}
      value={value}
      onChange={(value) => onChange(value)}
    />
  );
}
