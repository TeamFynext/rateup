import { Card } from "@/components/ui/card.tsx";

import TemplateCard from "./templateCard.tsx";

const SurveyTemplates = ({
  survey,
  setSelectedTemplate,
  bgTemp,
  open,
}: {
  survey: Survey;
  setSelectedTemplate: (survey: Survey) => void;
  bgTemp?: React.CSSProperties;
  open: () => void;
}) => {
  return (
    <Card
      className="p-0 cursor-pointer shadow-custom-base! hover:shadow-custom-hover! transition-shadow hover:-translate-y-0.5 gap-3.5"
      onClick={() => {
        setSelectedTemplate(survey);
        open();
      }}
      style={{
        ...(survey?.WelcomeTheme?.bgType === "bgcolor"
          ? (survey?.WelcomeTheme?.bgStyles ?? {})
          : bgTemp),
        width: "300px",
        minHeight: "150px",
        cursor: "pointer",
        marginTop: "2rem",
        overflow: "hidden",
        objectFit: "cover",
      }}
    >
      <TemplateCard survey={survey} />
    </Card>
  );
};

export default SurveyTemplates;
