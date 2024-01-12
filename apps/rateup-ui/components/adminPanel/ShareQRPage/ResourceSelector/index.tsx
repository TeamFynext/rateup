import { Button, Select } from "@mantine/core";
import styles from "./ResourceSelector.module.css";
import selectStyles from "./Select.module.css";
import { resourceOptions } from "./constants";
import { IconAnalyze } from "@tabler/icons-react";

function ResourceSelector({ resource, setResource, onGenerateBtnClick }) {
  return (
    <div className={styles["resource-selector-dropdown-container"]}>
      <Select
        placeholder="Select a Resource"
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
        Generate
      </Button>
    </div>
  );
}

export default ResourceSelector;
