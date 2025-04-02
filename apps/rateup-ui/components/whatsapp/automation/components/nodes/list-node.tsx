import { memo } from "react";

import { Box, Paper, Stack, Text } from "@mantine/core";
import { IconList } from "@tabler/icons-react";
import { Handle, Position, type NodeProps } from "@xyflow/react";

import { parseJsonToReact } from "@/components/RichTextEditor/waTextEditor";

import { ListNodeData } from "../../types/node-types";
import BaseNode from "./base-node";
import styles from "./node-styles.module.css";

function ListNode(props: NodeProps & { data: ListNodeData }) {
  const { data } = props;
  return (
    <BaseNode
      {...props}
      icon={<IconList size={16} />}
      color="#8bc34a"
      disableRight
    >
      <Stack gap="xs">
        {data.header && (
          <Box>
            <Text fz={"sm"} span>
              Header:
            </Text>{" "}
            {data.header}
          </Box>
        )}
        {data.body && (
          <Box>
            <Text fz={"sm"} span>
              Body:
            </Text>{" "}
            {parseJsonToReact(data.body)}
          </Box>
        )}
        {data.footer && (
          <Box>
            <Text fz={"sm"} span>
              Footer:
            </Text>{" "}
            {parseJsonToReact(data.footer)}
          </Box>
        )}
        {data.button && (
          <Box>
            <Text fz={"sm"} span>
              Button:
            </Text>{" "}
            {data.button}
          </Box>
        )}
        {data.sections && data.sections.length > 0 && (
          <Box>
            <Text fz={"sm"}>Sections:</Text>
            <Stack gap="xs" mt="xs">
              {data.sections.map((section, sectionIndex) => (
                <Paper key={sectionIndex} p="xs" withBorder>
                  <Text weight={600}>{section.title}</Text>
                  <Stack gap="xs" mt="xs">
                    {section.rows.map((row) => (
                      <div key={row.id} className={styles.button}>
                        <Text size="sm" weight={500}>
                          {row.title}
                        </Text>
                        {row.description && (
                          <Text size="xs" color="dimmed">
                            {row.description}
                          </Text>
                        )}
                        <Handle
                          type="source"
                          position={Position.Right}
                          id={row?.id}
                          className={styles.handle}
                          style={{
                            border: `3px solid #8bc34a`,
                            zIndex: 12,
                          }}
                        />
                      </div>
                    ))}
                  </Stack>
                </Paper>
              ))}
            </Stack>
          </Box>
        )}
      </Stack>
    </BaseNode>
  );
}

export default memo(ListNode);
