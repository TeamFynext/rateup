import { CheckIcon, ColorSwatch, Group } from "@mantine/core";

import { swatchesNamesArray } from "../../SurveyTheme.constants";

interface CustomColorSwatchProps {
  value: string;
  onChange: (value: string) => void;
}
export default function CustomColorSwatch({
  onChange,
  value,
}: CustomColorSwatchProps) {
  return (
    <Group gap={2}>
      {swatchesNamesArray.map((swatchName) => (
        <ColorSwatch
          w={40}
          h={40}
          radius={5}
          color={swatchName}
          component="button"
          onClick={() => onChange(swatchName)}
          key={swatchName}
        >
          {value === swatchName && <CheckIcon color="white" width={10} />}
        </ColorSwatch>
      ))}
    </Group>
  );
}
