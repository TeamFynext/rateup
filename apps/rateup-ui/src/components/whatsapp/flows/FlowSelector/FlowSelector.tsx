import type { SelectProps } from "@mantine/core";
import { Skeleton } from "@mantine/core";

import { useWaFlowsFromDb } from "@/backend/whatsapp/flow/flow.query";
import { WaFlowStatus } from "@/types/enums.ts";

import { ContainedSelection } from "../../../input/ContainedInput/ContainedInput.tsx";

interface FlowSelectorProps extends SelectProps {
  value?: string;
  onChange?: (flowId: string) => void;
  onlyPublished?: boolean;
  id?: "flowId" | "dbFlowId"; // flowId - id from flow object of whatsapp, dbFlowId - id from our db
}

export function FlowSelector({
  value,
  onChange,
  id = "dbFlowId",
  onlyPublished = false,
  ...props
}: FlowSelectorProps) {
  const { data: flows, isLoading } = useWaFlowsFromDb();

  if (isLoading || !flows) {
    return <Skeleton h={46} mt={"sm"} />;
  }

  const filteredFlows = onlyPublished
    ? flows.filter((flow) => flow.status === WaFlowStatus.PUBLISHED)
    : flows;

  const selectOptions = filteredFlows.map((flow) => ({
    value: flow[id],
    label: flow.name,
  }));

  return (
    <ContainedSelection
      data={selectOptions}
      value={value?.toString()} // TODO: check why flowId is saved as number in db
      onChange={onChange}
      placeholder="Select flow"
      label="Flow"
      {...props}
    />
  );
}
