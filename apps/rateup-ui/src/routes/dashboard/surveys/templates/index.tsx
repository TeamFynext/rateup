import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useSurveyTemplates } from "@/backend/surveys/surveys.query";
import { useTeamsByUser } from "@/backend/team/team.query";
import InfoButton from "@/components/Button/InfoButton.tsx";
import RefreshButton from "@/components/Button/RefreshButton.tsx";
import {
  ListPage,
  ListPageContent,
  ListPageHeader,
  ListPageHeaderSection,
} from "@/components/common/list-page-layout.tsx";
import SurveyTemplates from "@/components/dashboard/surveys/templates/surveyTemplates.tsx";
import { CreateSurveyModal } from "@/components/Survey/CreateSurveyModal.tsx";
import SurveySectionTabs from "@/components/Survey/SurveySectionTabs.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { useUser } from "@/context/UserContext.tsx";
import { docsPath } from "@/utils/constants.ts";
import { UserRole } from "@/utils/enums/index.ts";

export const Route = createFileRoute("/dashboard/surveys/templates/")({
  component: Templates,
});

function Templates() {
  const { user } = useUser();
  const { data: teamRes, isLoading: teamsLoading } = useTeamsByUser();
  const [selectedTemplate, setSelectedTemplate] = useState<Survey | null>(null);
  const navigate = useNavigate();
  const { t: translations } = useTranslation();
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [createSurveyOpened, setCreateSurveyOpened] = useState(false);

  const { isLoading, data: allTemplates } = useSurveyTemplates("web");

  const bgTemp = {
    backgroundColor: "#fff",
  };

  const handleTemplateSelect = (template: Survey) => {
    setSelectedTemplate(template);
    setIsTemplateDialogOpen(true);
  };

  const handleCreateFromTemplate = () => {
    setIsTemplateDialogOpen(false);
    setCreateSurveyOpened(true);
  };

  function Category({ categoryName, surveys }: { categoryName: string; surveys: Survey[] }) {
    return (
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-4">{categoryName}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {surveys?.map((survey: Survey, index: number) => (
            <div
              key={survey?.id}
              className="cursor-pointer"
              onClick={() => handleTemplateSelect(survey)}
            >
              <SurveyTemplates
                key={index}
                survey={survey}
                setSelectedTemplate={handleTemplateSelect}
                bgTemp={bgTemp}
                open={() => handleTemplateSelect(survey)}
              />
              <p className="text-sm text-muted-foreground mt-3">{survey.title}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <SurveySectionTabs />
      <ListPage>
        <ListPageHeader>
          <ListPageHeaderSection className="gap-3">
            {user?.role !== UserRole.MEMBER && (
              <Button
                onClick={() => {
                  navigate({
                    to: "/dashboard/surveys",
                    search: { action: "create" },
                  });
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                {translations("Start Blank")}
              </Button>
            )}
            <InfoButton docUrl={`${docsPath}/webSurvey/surveyTemplates`} />
            <RefreshButton queryKeys={["survey-templates"]} />
          </ListPageHeaderSection>
        </ListPageHeader>

        <ListPageContent
          isLoading={isLoading || teamsLoading}
          isError={false}
          isEmpty={!isLoading && !teamsLoading && Object.keys(allTemplates || {}).length === 0}
          emptyTitle={translations("No templates found")}
          emptyDescription={translations("Check back later for more survey templates.")}
        >
          <div className="px-6 pb-6">
            {allTemplates &&
              Object.entries(allTemplates).map(([categoryName, surveys], index) => (
                <Category key={index} categoryName={categoryName} surveys={surveys} />
              ))}
          </div>
        </ListPageContent>
      </ListPage>

      <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{translations("Create Survey from Template")}</DialogTitle>
            <DialogDescription>
              {selectedTemplate?.title || translations("Template")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              {translations(
                "Customize and deploy this survey effortlessly to uncover actionable data that drives informed decisions and enhances your business strategies",
              )}
            </p>
            <Button onClick={handleCreateFromTemplate} className="w-full">
              {translations("Try this Template")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <CreateSurveyModal
        open={createSurveyOpened}
        close={() => setCreateSurveyOpened(false)}
        surveyType={"web"}
        teamsData={teamRes?.data}
        template={selectedTemplate}
        setTemplate={setSelectedTemplate}
      />
    </>
  );
}
