import React from "react";

import FormsFilter from "@/components/forms/FormsFilter";
import { useFlowFilterStore } from "@/utils/store";

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "PUBLISHED", label: "Published" },
  { value: "DRAFT", label: "Draft" },
] as const;

export default function FlowFilter() {
  return <FormsFilter store={useFlowFilterStore()} statusOptions={STATUS_OPTIONS} />;
}
