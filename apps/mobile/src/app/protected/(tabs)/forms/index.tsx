import { useState } from "react";

import FlowList from "@/components/forms/FlowList";
import FormsSwitch, { type FormsKind } from "@/components/forms/FormsSwitch";
import WebFormList from "@/components/forms/WebFormList";
import { useOrgModules } from "@/hooks/useOrgModules";

export default function FormsTab() {
  const [kind, setKind] = useState<FormsKind>("flow");
  const webForms = useOrgModules().isOn("web_forms");
  const switcher = webForms ? <FormsSwitch value={kind} onChange={setKind} /> : null;
  return kind === "flow" || !webForms ? (
    <FlowList switcher={switcher} />
  ) : (
    <WebFormList switcher={switcher} />
  );
}
