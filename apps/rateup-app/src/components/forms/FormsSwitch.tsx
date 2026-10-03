import React from "react";

import SegmentedControl from "@/components/common/SegmentedControl";

export type FormsKind = "flow" | "webform";

const OPTIONS = [
  { value: "flow", label: "WA Flow" },
  { value: "webform", label: "Web Forms" },
] as const;

export default function FormsSwitch({
  value,
  onChange,
}: Readonly<{ value: FormsKind; onChange: (value: FormsKind) => void }>) {
  return <SegmentedControl options={OPTIONS} value={value} onChange={onChange} />;
}
