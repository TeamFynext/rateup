import { lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";

import "react-date-range/dist/styles.css"; // main style file
import "react-date-range/dist/theme/default.css";

const DateRangePicker = lazy(() =>
  import("react-date-range").then((m) => ({ default: m.DateRangePicker })),
);

export const DateRangePickerModal = ({
  opened,
  onChange,
  ranges,
  close,
}: {
  opened: boolean;
  onChange: (ranges: Date[]) => void;
  ranges: Date[];
  close: () => void;
}) => {
  const { t: translations } = useTranslation();
  return (
    <Dialog
      open={opened}
      onOpenChange={(next) => {
        if (!next) close();
      }}
    >
      <DialogContent className="w-auto sm:max-w-fit">
        <DialogHeader>
          <DialogTitle>{translations("Date range picker")}</DialogTitle>
        </DialogHeader>
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
        <div className="flex flex-row items-center justify-end gap-2 mt-4">
          <Button variant="destructive" onClick={() => onChange(undefined)}>
            {translations("Clear")}
          </Button>
          <Button onClick={close}>{translations("Done")}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
