import React from "react";

import FormsFilter from "@/components/forms/FormsFilter";
import { useWebFormFilterStore } from "@/utils/store";

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "ACTIVE", label: "Active" },
  { value: "PAUSED", label: "Paused" },
] as const;

export default function WebFormFilter() {
  return <FormsFilter store={useWebFormFilterStore()} statusOptions={STATUS_OPTIONS} />;
}
