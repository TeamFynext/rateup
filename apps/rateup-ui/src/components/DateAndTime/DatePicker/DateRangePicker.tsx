import { Group, Modal } from "@mantine/core";
import { lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";

import { RateupButtonPrimary } from "@/components/Button/RateupButtons.tsx";

import "react-date-range/dist/styles.css"; // main style file
import "react-date-range/dist/theme/default.css";

const DateRangePicker = lazy(() =>
  import("react-date-range").then((m) => ({ default: m.DateRangePicker })),
);

export const DateRangePickerModal = ({ opened, onChange, ranges, close }) => {
  const { t: translations } = useTranslation();
  return (
    <Modal opened={opened} onClose={close} title={translations("Date range picker")} size={"auto"}>
      <Suspense
        fallback={
          <div className="p-8 text-center text-sm text-muted-foreground">Loading calendar...</div>
        }
      >
        <DateRangePicker
          onChange={onChange}
          moveRangeOnFirstSelection={false}
          months={2}
          ranges={ranges}
          direction="horizontal"
        />
      </Suspense>
      <Group justify="end">
        <RateupButtonPrimary
          onClick={() => onChange(undefined)}
          variant="outline"
          color="red"
          title={translations("Clear")}
        />
        <RateupButtonPrimary onClick={close} title={translations("Done")} />
      </Group>
    </Modal>
  );
};
