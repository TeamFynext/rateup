import {
  Select,
  Stack,
  Text,
  NumberInput,
  ScrollArea,
  Divider,
} from "@mantine/core";
import { Title } from "../surveyTheme.types";
import { FontWeights } from "../SurveyTheme.constants";
import CustomColorPicker from "./customelements/CustomColorPicker";
import CustomColorInput from "./customelements/CustomColorInput";

function HeaderStyles({
  currentStyles,
  setCurrentstyles,
}: {
  currentStyles: Title;
  setCurrentstyles: (key: string, value: any) => void;
}) {
  return (
    <ScrollArea h={"40vh"} w={"100%"}>
      <Stack align="center" w={"100%"}>
        <Divider label="Styles" variant="dashed" w={"100%"} />
        <Select
          label="Font weight"
          name="fontWeight"
          data={FontWeights}
          style={{ maxWidth: "150px" }}
          value={currentStyles?.styles?.fontWeight}
          onChange={(e) => {
            setCurrentstyles("title", {
              ...currentStyles,
              styles: { ...currentStyles.styles, fontWeight: e },
            });
          }}
        />
        <NumberInput
          min={10}
          max={100}
          defaultValue={18}
          placeholder="size"
          label="Font Size"
          name="fontSize"
          style={{ maxWidth: "150px" }}
          value={currentStyles?.styles?.fontSize}
          onChange={(e) => {
            setCurrentstyles("title", {
              ...currentStyles,
              styles: { ...currentStyles.styles, fontSize: e },
            });
          }}
        />
        <Text mt={10} fw={500}>
          Choose text color
        </Text>
        <CustomColorPicker
          value={currentStyles?.styles?.color}
          onChange={(e) => {
            setCurrentstyles("title", {
              ...currentStyles,
              styles: { ...currentStyles.styles, color: e },
            });
          }}
        />
        <CustomColorInput
          value={currentStyles?.styles?.color}
          onChange={(e) => {
            setCurrentstyles("title", {
              ...currentStyles,
              styles: { ...currentStyles.styles, color: e },
            });
          }}
        />
      </Stack>
    </ScrollArea>
  );
}

export default HeaderStyles;
