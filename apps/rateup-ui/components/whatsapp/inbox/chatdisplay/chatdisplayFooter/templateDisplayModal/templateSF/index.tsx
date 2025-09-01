"use client";

import { Paper } from "@mantine/core";
import { useTranslations } from "next-intl";

import { ContainedTextField } from "../../../../../../input/ContainedInput/ContainedInput";
import classes from "./styles.module.css";

interface Props {
  searchTerm: string;
  setSearchTerm: (searchTerm: string) => void;
}
export default function WaTemplateSF({ searchTerm, setSearchTerm }: Props) {
  const translations = useTranslations();
  return (
    <Paper className={classes.wrapper}>
      <ContainedTextField
        className={classes.template_search}
        placeholder={translations("Search template")}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
    </Paper>
  );
}
