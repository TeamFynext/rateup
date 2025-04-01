import { memo } from "react";

import { Stack, Text } from "@mantine/core";
import { IconPhone } from "@tabler/icons-react";
import { NodeProps } from "@xyflow/react";

import { ContactsNodeData } from "../../types/node-types";
import BaseNode from "./base-node";

function ContactsNode(props: NodeProps & { data: ContactsNodeData }) {
  const { data } = props;
  return (
    <BaseNode {...props} icon={<IconPhone size={16} />} color="#ec4899">
      <Stack>
        <Text>Total Contacts To Send: {data.contacts?.length}</Text>
      </Stack>
    </BaseNode>
  );
}

export default memo(ContactsNode);
