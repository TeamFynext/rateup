import { useState } from "react";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import { BusinessInfoPanel } from "./knowledge/BusinessInfoPanel";
import { FaqsPanel } from "./knowledge/FaqsPanel";
import { FilesPanel } from "./knowledge/FilesPanel";
import { WebsitesPanel } from "./knowledge/WebsitesPanel";

const PILLS = [
  { id: "business-info", label: "Business info" },
  { id: "faqs", label: "FAQs" },
  { id: "files", label: "Files" },
  { id: "websites", label: "Websites" },
] as const;

type PillId = (typeof PILLS)[number]["id"];

export function KnowledgeSection({ waSettingsId }: { waSettingsId: string }) {
  const [active, setActive] = useState<PillId>("business-info");

  return (
    <div className="space-y-4">
      <ToggleGroup
        variant="outline"
        value={[active]}
        onValueChange={(value) => value && setActive(value?.[0] as PillId)}
      >
        {PILLS.map((pill) => (
          <ToggleGroupItem key={pill.id} value={pill.id}>
            {pill.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      {active === "business-info" && <BusinessInfoPanel waSettingsId={waSettingsId} />}
      {active === "faqs" && <FaqsPanel waSettingsId={waSettingsId} />}
      {active === "files" && <FilesPanel waSettingsId={waSettingsId} />}
      {active === "websites" && <WebsitesPanel waSettingsId={waSettingsId} />}
    </div>
  );
}
