import { Chip } from "@mantine/core";
import styles from "./ChipGroup.module.css";

function ChipGroup({ value, handleChange, chipsData, multiple }) {
  return (
    <Chip.Group multiple={multiple} onChange={handleChange} value={value}>
      {chipsData.map((chipDataObj: { label: string; value: string }) => {
        return (
          <Chip
            value={chipDataObj.value}
            classNames={styles}
            key={chipDataObj.label}
          >
            {chipDataObj.label}
          </Chip>
        );
      })}
    </Chip.Group>
  );
}

export default ChipGroup;
