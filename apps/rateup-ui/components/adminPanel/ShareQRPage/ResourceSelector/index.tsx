"use client";

import { Button, Select } from "@mantine/core";
import { IconAnalyze } from "@tabler/icons-react";
import { useExtracted } from "next-intl";

import { resourceOptions } from "./constants";
import styles from "./ResourceSelector.module.css";
import selectStyles from "./Select.module.css";

function ResourceSelector({ resource, setResource, onGenerateBtnClick }) {
  const translations = useExtracted();
  return (
    <div className={styles["resource-selector-dropdown-container"]}>
      <Select
        placeholder={translations("Select a Resource")}
        data={resourceOptions}
        classNames={selectStyles}
        onChange={setResource}
        value={resource}
      />
      <Button
        variant="filled"
        onClick={onGenerateBtnClick}
        rightSection={<IconAnalyze />}
      >
        {translations("Generate")}
      </Button>
    </div>
  );
}

export default ResourceSelector;
