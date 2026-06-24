import { useDisclosure } from "@mantine/hooks";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { useTeamsByUser } from "@/backend/team/team.query";
import { SurveyCard } from "@/components/Card/SurveyCard/SurveyCard.tsx";
import { sortData } from "@/components/dashboard/SortDropDown.tsx";
import NothingFound from "@/components/NothingFound/NothingFound.tsx";

import { CreateSurveyModal } from "../CreateSurveyModal.tsx";
import SurveyTemplatesModal from "../SurveyTemplatesModal.tsx";
import { SurveyHeader } from "./SurveysPageHeader.tsx";

// USED IN:
// dashboard/surveys
// dashboard/whatsapp/surveys

interface SurveysPageProps {
  allSurveys: Survey[];
  selectedTeamId: string;
  setSelectedTeamId: (id: string) => void;
  surveyType?: "web" | "whatsapp";
  refetch: any;
}

export function SurveysPage({
  allSurveys,
  selectedTeamId,
  setSelectedTeamId,
  surveyType = "web",
  refetch,
}: Readonly<SurveysPageProps>) {
  const navigate = useNavigate();
  const searchParams = useSearch({ strict: false });
  const action = searchParams.action;

  const [createSurveyOpened, { open: openCreateSurvey, close: closeCreateSurvey }] = useDisclosure(
    action === "create",
  );
  const [surveyTemplatesOpened, { close: closeSurveyTemplates }] = useDisclosure(false);
  const [sortOption, setSortOption] = useState("latest");
  const [surveyidArray, setSurveyIdArray] = useState([]);
  const [filterParam, setFilterParam] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const { t: translations } = useTranslation();

  const [template, setTemplate] = useState(null);

  const { data: teamRes } = useTeamsByUser();

  useEffect(() => {
    if (createSurveyOpened === false) {
      if (surveyType === "web") {
        navigate({
          to: `/dashboard/surveys`,
        });
      } else {
        navigate({
          to: `/dashboard/whatsapp`,
        });
      }
    }
  }, [createSurveyOpened]);

  // ----------close merge survey modal ---------

  const surveys =
    selectedTeamId === "all" || !selectedTeamId
      ? allSurveys
      : allSurveys?.filter((s: Survey) => s?.teams?.some((team) => team?.id === selectedTeamId));
  // --------handle check box click ----------

  const handleCheckBox = (e, surveyid, _checked) => {
    e.stopPropagation();
    if (surveyidArray.includes(surveyid)) {
      setSurveyIdArray(surveyidArray.filter((id) => id !== surveyid));
    } else if (e.target.checked) {
      setSurveyIdArray([...surveyidArray, surveyid]);
    }
  };
  // --------------check if survey is selected------
  const isChecked = (surveyid) => {
    const surveysarray = surveyidArray;
    let found = false;
    for (const element of surveysarray) {
      if (surveyid == element) {
        found = true;
        break;
      }
    }
    return found;
  };

  const sortedSurveys = sortData(
    surveys.map((s) => ({ ...s, data: { name: s.title } })),
    sortOption,
  );

  const filteredSurvey = sortedSurveys.filter((s) => s.title.includes(searchQuery));

  return (
    <div className="flex flex-col gap-2 h-full">
      <SurveyHeader
        selectedTeamId={selectedTeamId}
        setSelectedTeamId={setSelectedTeamId}
        filterParam={filterParam}
        setFilterParam={setFilterParam}
        openCreateSurvey={openCreateSurvey}
        onSortChange={setSortOption}
        sortOption={sortOption} //
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />
      {surveys?.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
          {filteredSurvey
            .filter((s) => {
              if (filterParam === "active") {
                return s.active === true;
              } else if (filterParam === "paused") {
                return s.active === false;
              } else {
                return true;
              }
            })
            .map((s) => (
              <SurveyCard
                key={s.id}
                survey={s}
                handleCheckBox={handleCheckBox}
                isChecked={isChecked}
                selectedTeamId={selectedTeamId}
                teamsData={teamRes?.data}
                refetchSurveys={refetch}
              />
            ))}
        </div>
      ) : (
        <NothingFound text={translations("No Surveys Found")} />
      )}
      {createSurveyOpened && (
        <CreateSurveyModal
          open={createSurveyOpened}
          close={closeCreateSurvey}
          surveyType={surveyType}
          teamsData={teamRes?.data}
          template={template}
          setTemplate={setTemplate}
        />
      )}
      {surveyTemplatesOpened && (
        <SurveyTemplatesModal
          opened={surveyTemplatesOpened}
          close={closeSurveyTemplates}
          openCreateSurvey={openCreateSurvey}
          setTemplate={setTemplate}
          surveyType={surveyType}
        />
      )}
    </div>
  );
}
