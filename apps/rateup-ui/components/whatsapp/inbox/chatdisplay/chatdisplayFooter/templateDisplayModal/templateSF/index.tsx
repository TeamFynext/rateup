import { ContainedTextField } from "../../../../../../input/ContainedInput/ContainedInput";
import classes from "./styles.module.css";
import { Paper } from "@mantine/core";

interface Props {
  searchTerm: string;
  setSearchTerm: (searchTerm: string) => void;
}
export default function WaTemplateSF({ searchTerm, setSearchTerm }: Props) {
  return (
    <Paper className={classes.wrapper}>
      <ContainedTextField
        className={classes.template_search}
        placeholder="Search template"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
    </Paper>
  );
}
