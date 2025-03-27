import { memo } from "react";

import { Badge, Group, Stack, Text } from "@mantine/core";
import { IconPhone } from "@tabler/icons-react";
import { NodeProps } from "@xyflow/react";

import { ContactsNodeData } from "../../types/node-types";
import BaseNode from "./base-node";

function ContactsNode(props: NodeProps & { data: ContactsNodeData }) {
  const { data } = props;
  return (
    <BaseNode {...props} icon={<IconPhone size={16} />} color="#ec4899">
      <Stack>
        {data.name && (
          <Stack gap="xs">
            <Group gap="xs">
              <Text fw={600}>Name:</Text>
              <Text>{data.name.formatted_name}</Text>
            </Group>
          </Stack>
        )}

        {data.org && (
          <Stack gap="xs">
            {data.org.company && (
              <Group gap="xs">
                <Text fw={600}>Company:</Text>
                <Text>{data.org.company}</Text>
              </Group>
            )}
            {data.org.title && (
              <Group gap="xs">
                <Text fw={600}>Title:</Text>
                <Text>{data.org.title}</Text>
              </Group>
            )}
          </Stack>
        )}

        {data.birthday && (
          <Group gap="xs">
            <Text fw={600}>Birthday:</Text>
            <Text>{data.birthday}</Text>
          </Group>
        )}

        {data.phones && data.phones.length > 0 && (
          <Group gap="xs">
            <Text fw={600}>Phone:</Text>
            <Text>{data.phones[0].phone}</Text>
            <Badge size="xs">{data.phones[0].type}</Badge>
          </Group>
        )}

        {data.emails && data.emails.length > 0 && (
          <Group gap="xs">
            <Text fw={600}>Email:</Text>
            <Text>{data.emails[0].email}</Text>
          </Group>
        )}

        {data.addresses && data.addresses.length > 0 && (
          <Group gap="xs">
            <Text fw={600}>Address:</Text>
            <Text>
              {data.addresses[0].street && `${data.addresses[0].street}, `}
              {data.addresses[0].city && `${data.addresses[0].city}, `}
              {data.addresses[0].state}
            </Text>
          </Group>
        )}
      </Stack>
    </BaseNode>
  );
}

export default memo(ContactsNode);
