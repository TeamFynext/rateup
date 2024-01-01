import { Group, MantineThemeContext, useMantineTheme } from "@mantine/core";
import {
  GridToolbarContainer,
  GridToolbarExport,
  GridToolbarFilterButton,
  GridToolbarQuickFilter,
} from "@mui/x-data-grid";
import styles from "./CustomGridToolbar.module.css";

function CustomGridToolbar() {
  const theme = useMantineTheme();
  const primaryColor = theme?.primaryColor;

  return (
    <GridToolbarContainer className={styles["grid-toolbar-container"]}>
      <GridToolbarQuickFilter />
      <Group>
        {/* <GridToolbarColumnsButton />
        <GridToolbarFilterButton /> */}
        <GridToolbarExport
          className={styles["export-btn"]}
          style={{ backgroundColor: theme.colors[primaryColor][6] }}
          printOptions={{
            hideFooter: true,
            hideToolbar: true,
            disableToolbarButton: true,
          }}
        />
      </Group>
    </GridToolbarContainer>
  );
}

export default CustomGridToolbar;
