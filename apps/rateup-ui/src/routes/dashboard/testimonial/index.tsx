import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  useGetAllCollectionsByOrg,
  useGetAllTestimonialsByOrg,
} from "@/backend/testimonials/testimonial.query";
import InfoButton from "@/components/Button/InfoButton.tsx";
import RefreshButton from "@/components/Button/RefreshButton.tsx";
import { CardGrid } from "@/components/common/generic-card.tsx";
import {
  ListPage,
  ListPageContent,
  ListPageHeader,
  ListPageHeaderSection,
} from "@/components/common/list-page-layout.tsx";
import { TeamSelector } from "@/components/input/TeamSelector.tsx";
import SaveTestimonialCollection from "@/components/testimonial/SaveTestimonialCollection.tsx";
import TestimonialCard from "@/components/testimonial/TestimonialCard.tsx";
import TestimonialCollectionCard from "@/components/testimonial/TestimonialCollectionCard.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { docsPath } from "@/utils/constants.ts";

export const Route = createFileRoute("/dashboard/testimonial/")({
  component: Testimonials,
});

function Testimonials() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("testimonials");
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const { t: translations } = useTranslation();

  const { data: collections = [], isLoading: isCollectionLoading } = useGetAllCollectionsByOrg();
  const { data: testimonials = [], isLoading: isTestimonialLoading } = useGetAllTestimonialsByOrg();

  const filteredCollections = useMemo(() => {
    return selectedTeamId === "all" || !selectedTeamId
      ? collections
      : collections.filter((c) => c.teamId === selectedTeamId);
  }, [collections, selectedTeamId]);

  const filteredTestimonials = useMemo(() => {
    return selectedTeamId === "all" || !selectedTeamId
      ? testimonials
      : testimonials.filter((t) => t.teamId === selectedTeamId);
  }, [testimonials, selectedTeamId]);

  return (
    <ListPage>
      <ListPageHeader>
        <ListPageHeaderSection className="gap-3">
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {translations("Create Collection")}
          </Button>
          <InfoButton docUrl={`${docsPath}/testimonial`} />
          <RefreshButton queryKeys={["testimonials", "collections"]} />
        </ListPageHeaderSection>

        <ListPageHeaderSection>
          <TeamSelector value={selectedTeamId} onChange={setSelectedTeamId} enableAll={true} />
        </ListPageHeaderSection>
      </ListPageHeader>

      <div className="px-6 pb-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="testimonials">{translations("Testimonials")}</TabsTrigger>
            <TabsTrigger value="collections">{translations("Collections")}</TabsTrigger>
          </TabsList>

          <TabsContent value="testimonials" className="mt-6">
            <ListPageContent
              isLoading={isTestimonialLoading}
              isError={false}
              isEmpty={!isTestimonialLoading && filteredTestimonials.length === 0}
              emptyTitle={translations("No testimonials found")}
              emptyDescription={translations(
                "Testimonials will appear here once submissions are received.",
              )}
            >
              <CardGrid
                items={filteredTestimonials}
                getKey={(c) => c.id}
                renderItem={(c) => <TestimonialCard testimonial={c} key={c.id} />}
              />
            </ListPageContent>
          </TabsContent>

          <TabsContent value="collections" className="mt-6">
            <ListPageContent
              isLoading={isCollectionLoading}
              isError={false}
              isEmpty={!isCollectionLoading && filteredCollections.length === 0}
              emptyTitle={translations("No collections found")}
              emptyDescription={translations("Create a new testimonial collection to get started.")}
            >
              <CardGrid
                items={filteredCollections}
                getKey={(c: any) => c.id}
                renderItem={(c: any) => <TestimonialCollectionCard collection={c} />}
              />
            </ListPageContent>
          </TabsContent>
        </Tabs>
      </div>

      {isCreateDialogOpen && (
        <SaveTestimonialCollection
          close={() => setIsCreateDialogOpen(false)}
          opened={isCreateDialogOpen}
        />
      )}
    </ListPage>
  );
}
