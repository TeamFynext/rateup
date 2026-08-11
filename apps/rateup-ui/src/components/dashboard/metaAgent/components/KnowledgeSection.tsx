import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { BusinessInfoPanel } from "./knowledge/BusinessInfoPanel";
import { FaqsPanel } from "./knowledge/FaqsPanel";
import { FilesPanel } from "./knowledge/FilesPanel";
import { WebsitesPanel } from "./knowledge/WebsitesPanel";

export function KnowledgeSection({ waSettingsId }: Readonly<{ waSettingsId: string }>) {
  return (
    <Tabs defaultValue="business-info">
      <TabsList>
        <TabsTrigger value="business-info">Business info</TabsTrigger>
        <TabsTrigger value="faqs">FAQs</TabsTrigger>
        <TabsTrigger value="files">Files</TabsTrigger>
        <TabsTrigger value="websites">Websites</TabsTrigger>
      </TabsList>

      <TabsContent value="business-info">
        <BusinessInfoPanel waSettingsId={waSettingsId} />
      </TabsContent>
      <TabsContent value="faqs">
        <FaqsPanel waSettingsId={waSettingsId} />
      </TabsContent>
      <TabsContent value="files">
        <FilesPanel waSettingsId={waSettingsId} />
      </TabsContent>
      <TabsContent value="websites">
        <WebsitesPanel waSettingsId={waSettingsId} />
      </TabsContent>
    </Tabs>
  );
}
