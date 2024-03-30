import { useState } from "react";
import { WaTemplate } from "../../../../../../../backend/whatsapp/whatsapp.api";
import { ContainedTextField } from "../../../../../../input/ContainedInput/ContainedInput";
import classes from "./styles.module.css";
import { Paper } from "@mantine/core";

interface Props {
  templateFullData: WaTemplate[];
  setTemplateSFData: (data: WaTemplate[]) => void;
}
export default function WaTemplateSF(props: Props) {
  const [searchString, setSearchString] = useState<string>("");
  function onTemplateSearch(searchString: string) {
    const filteredData = props?.templateFullData?.filter((template) =>
      template?.data?.name?.toLowerCase().includes(searchString?.toLowerCase()),
    );
    setSearchString(searchString);
    props?.setTemplateSFData(filteredData);
  }
  return (
    <Paper className={classes.wrapper}>
      <ContainedTextField
        className={classes.template_search}
        placeholder="Search template"
        value={searchString}
        onChange={(e) => onTemplateSearch(e.target.value)}
      />
    </Paper>
  );
}
