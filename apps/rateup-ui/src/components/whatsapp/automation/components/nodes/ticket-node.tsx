import { memo } from "react";

import { Box, Group, Stack, Text } from "@mantine/core";
import { IconTicket } from "@tabler/icons-react";
import type { NodeProps } from "@xyflow/react";

import type { TicketNodeData } from "../../types/node-types.ts";

import BaseNode from "./base-node.tsx";

function TicketNode(props: NodeProps & { data: TicketNodeData }) {
  const { data } = props;
  return (
    <BaseNode {...props} icon={<IconTicket size={16} />} color="#3f51b5">
      <Box>
        <Text fw={600} mb="xs">
          Create Ticket
        </Text>
        <Stack gap="xs">
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              Board:
            </Text>
            <Text size="sm">{data.ticket?.selectedBoardName}</Text>
          </Group>
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              Column :
            </Text>
            <Text size="sm">{data.ticket?.selectedBoardColumnName}</Text>
          </Group>
        </Stack>
      </Box>
    </BaseNode>
  );
}

export default memo(TicketNode);
