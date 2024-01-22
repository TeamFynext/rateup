import { Group } from "@mantine/core";
import {
  DataGrid,
  GridPrintGetRowsToExportParams,
  GridRowId,
  GridToolbarColumnsButton,
  GridToolbarContainer,
  GridToolbarExport,
  GridToolbarFilterButton,
  GridToolbarQuickFilter,
  gridFilteredSortedRowIdsSelector,
  selectedGridRowsSelector,
} from "@mui/x-data-grid";

function CustomGridToolbar() {
  return (
    <GridToolbarContainer style={{ justifyContent: "space-between" }}>
      {/* <Group>
        <GridToolbarColumnsButton />
        <GridToolbarFilterButton />
        <GridToolbarExport
          printOptions={{
            hideFooter: true,
            hideToolbar: true,
          }}
        />
      </Group> */}
      <GridToolbarQuickFilter />
    </GridToolbarContainer>
  );
}

export default CustomGridToolbar;
