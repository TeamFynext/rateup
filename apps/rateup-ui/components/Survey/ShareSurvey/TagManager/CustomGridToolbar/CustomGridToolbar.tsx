import { Group } from "@mantine/core";
import {
  ExportCsv,
  ExportPrint,
  QuickFilter,
  QuickFilterClear,
  QuickFilterControl,
  QuickFilterTrigger,
  Toolbar,
} from "@mui/x-data-grid";

import styles from "./CustomGridToolbar.module.css";

function CustomGridToolbar() {
  return (
    <Toolbar className={styles["grid-toolbar-container"]}>
      <QuickFilter>
        <QuickFilterTrigger />
        <QuickFilterControl />
        <QuickFilterClear />
      </QuickFilter>
      <Group>
        {/* <GridToolbarColumnsButton />
        <GridToolbarFilterButton /> */}
        <ExportPrint
          options={{
            hideFooter: true,
            hideToolbar: true,
          }}
        />
        <ExportCsv />
      </Group>
    </Toolbar>
  );
}

export default CustomGridToolbar;
