import { Stack, Text } from "@mantine/core";
import { IconLink } from "@tabler/icons-react";
import type { NodeProps } from "@xyflow/react";
import { memo } from "react";

import { parseJsonToReact } from "@/components/RichTextEditor/waTextEditor.tsx";

import type { CTAUrlNodeData } from "../../types/node-types.ts";
import BaseNode from "./base-node.tsx";

// export default CtaUrlNode
function CtaUrlNode(props: NodeProps & { data: CTAUrlNodeData }) {
  const { data } = props;
  return (
    <BaseNode {...props} icon={<IconLink size={16} />} color="#10b981">
      <Stack gap="xs">
        {data.header && <Text fw={500}>{data.header}</Text>}
        {data.body && <Text size="sm">{parseJsonToReact(data.body)}</Text>}
        <Stack gap="xs">
          <Text size="sm" fw={500}>
            Display Text:
          </Text>
          <Text size="sm">{data.display_text}</Text>
        </Stack>
        <Stack gap="xs">
          <Text size="sm" fw={500}>
            URL:
          </Text>
          <Text size="sm" className="wrap-break-word">
            {data.url}
          </Text>
        </Stack>
        {data.footer && <Text size="xs">{parseJsonToReact(data.footer)}</Text>}
      </Stack>
    </BaseNode>
  );
}

export default memo(CtaUrlNode);
