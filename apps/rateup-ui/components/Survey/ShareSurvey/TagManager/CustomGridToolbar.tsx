import {
  QuickFilter,
  QuickFilterClear,
  QuickFilterControl,
  QuickFilterTrigger,
  Toolbar,
} from "@mui/x-data-grid";

function CustomGridToolbar() {
  return (
    <Toolbar style={{ justifyContent: "space-between" }}>
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
      <QuickFilter>
        <QuickFilterTrigger />
        <QuickFilterControl />
        <QuickFilterClear />
      </QuickFilter>
      ;
    </Toolbar>
  );
}

export default CustomGridToolbar;
