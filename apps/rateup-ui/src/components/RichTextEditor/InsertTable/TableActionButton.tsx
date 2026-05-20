import { ActionIcon, Tooltip } from "@mantine/core";

function TableActionButton({ onClick, icon, label, value }) {
  return (
    <Tooltip label={label} position="bottom">
      <ActionIcon variant="light" value={value} onClick={onClick}>
        {icon}
      </ActionIcon>
    </Tooltip>
  );
}

export default TableActionButton;
