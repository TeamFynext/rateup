import { useState } from "react";

import FlowList from "@/components/forms/FlowList";
import FormsSwitch, { type FormsKind } from "@/components/forms/FormsSwitch";
import WebFormList from "@/components/forms/WebFormList";

export default function FormsTab() {
  const [kind, setKind] = useState<FormsKind>("flow");
  const switcher = <FormsSwitch value={kind} onChange={setKind} />;
  return kind === "flow" ? <FlowList switcher={switcher} /> : <WebFormList switcher={switcher} />;
}
