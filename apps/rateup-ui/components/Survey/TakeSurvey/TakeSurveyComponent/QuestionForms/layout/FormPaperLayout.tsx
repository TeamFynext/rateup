import { Paper, useMantineTheme } from "@mantine/core";
import { returnColorsForTheme } from "../../../../SurveyTheme/SurveyTheme.utils";
import { styleAttributeTypesEnum } from "../../../../SurveyTheme/SurveyTheme.enums";
import classes from "../../TakeSurvey.module.css";
export default function FormPaperLayout(props: any) {
  const theme = useMantineTheme();
  return (
    <Paper
      {...props}
      h={"fit-content"}
      shadow="sm"
      className={classes.inputBox}
      bg={returnColorsForTheme(styleAttributeTypesEnum.BACKGROUND, theme)}
      style={{
        borderColor: returnColorsForTheme(
          styleAttributeTypesEnum.BORDER,
          theme,
        ),
      }}
    >
      {props.children}
    </Paper>
  );
}
