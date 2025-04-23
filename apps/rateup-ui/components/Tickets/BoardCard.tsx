import { ActionIcon, Card, Group, Menu, Text } from "@mantine/core";
import { IconDots, IconEdit, IconTrash } from "@tabler/icons-react";

export function BoardCard({
  board,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
}: {
  board: { id: string; title: string; teamIds: string[] };
  isSelected: boolean;
  onSelect: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <Card
      shadow="sm"
      padding="lg"
      radius="lg"
      withBorder
      styles={{
        root: { cursor: "pointer" },
      }}
      onClick={() => onSelect(board.id)}
    >
      <Group mb="lg" justify="space-between" align="center">
        <Text fw={500}>{board.title}</Text>
        <Menu shadow="md" position="bottom-end" withinPortal>
          <Menu.Target>
            <ActionIcon
              size="md"
              variant="subtle"
              onClick={(e) => e.stopPropagation()}
            >
              <IconDots size={22} />
            </ActionIcon>
          </Menu.Target>

          <Menu.Dropdown>
            <Menu.Item
              icon={<IconEdit size={14} />}
              onClick={(e) => {
                e.stopPropagation();
                onEdit(board.id);
              }}
            >
              Edit board
            </Menu.Item>
            <Menu.Item
              icon={<IconTrash size={14} />}
              color="red"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(board.id);
              }}
            >
              Delete board
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>
    </Card>
  );
}
