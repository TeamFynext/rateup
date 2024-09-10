import { Group, Stack } from "@mantine/core";
import classNames from "classnames/bind";

import styles from "./UseCase.module.css";
import UseCaseCard from "./UseCaseCard";
import { useCasesData } from "./useCaseData";

const cx = classNames.bind(styles);

function UseCase() {
  return (
    <Stack className={cx("use-case-root-div")}>
      <h1 className={cx("heading")}>Use Case</h1>
      <Group className={cx("use-case-cards-container")}>
        <Stack className={cx("column-1")}>
          {useCasesData.map((cardData, index) => {
            if (index % 2 == 0) {
              return <UseCaseCard {...cardData} />;
            } else {
              return null;
            }
          })}
        </Stack>
        <Stack className={cx("column-2")}>
          {useCasesData.map((cardData, index) => {
            if (index % 2 == 1) {
              return <UseCaseCard {...cardData} />;
            } else {
              return null;
            }
          })}
        </Stack>
      </Group>
    </Stack>
  );
}

export default UseCase;
