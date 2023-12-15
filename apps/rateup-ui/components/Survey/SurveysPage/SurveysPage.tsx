import { Stack, Space } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { Router, useRouter } from "next/router";
import { useState, useEffect } from "react";
import CreateSurveyLandingModal from "../../../pages/dashboard/groupsurveys/CreateSurveyLandingModal";
import { SurveyCard } from "../../Card/SurveyCard/SurveyCard";
import { SurveyCardLayout } from "../../Card/SurveyCard/SurveyCardLayout";
import NothingFound from "../../NothingFound/NothingFound";
import { CreateSurveyModal } from "../CreateSurveyModal";
import { SurveyHeader } from "./SurveysPageHeader";
import { useTeamsByUser } from "../../../backend/team/team.query";
import SurveyTemplatesModal from "../SurveyTemplatesModal";

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
}: SurveysPageProps) {
  const [
    createSurveyOpened,
    { open: openCreateSurvey, close: closeCreateSurvey },
  ] = useDisclosure(false);
  const [
    surveyTemplatesOpened,
    { open: openSurveyTemplates, close: closeSurveyTemplates },
  ] = useDisclosure(false);
  const [
    mergeSurveyOpened,
    { open: openMergeSurvey, close: closeMergeSurveyModal },
  ] = useDisclosure(false);
  const [sort, setSort] = useState(true);
  const [surveyidArray, setSurveyIdArray] = useState([]);
  const [filterParam, setFilterParam] = useState("all");
  const router = useRouter();

  const { action } = router.query;
  const [template, setTemplate] = useState(null);

  const {
    data: teamRes,
    isLoading: teamsLoading,
    isError,
    error,
  } = useTeamsByUser();

  useEffect(() => {
    if (action === "create") {
      openCreateSurvey();
    }
  }, [action]);

  useEffect(() => {
    if (createSurveyOpened === false) {
      surveyType === "web"
        ? router.push(`/dashboard/surveys`)
        : router.push(`/dashboard/whatsapp/surveys`);
    }
  }, [createSurveyOpened]);

  //----------close merge survey modal ---------
  const closeMergeSurvey = () => {
    setSurveyIdArray([]);
    closeMergeSurveyModal();
  };

  const surveys =
    selectedTeamId === "all" || !selectedTeamId
      ? allSurveys
      : allSurveys?.filter(
          (s: Survey) => s?.teams?.some((team) => team?.id === selectedTeamId),
        );
  //--------handle check box click ----------

  const handleCheckBox = (e, surveyid, checked) => {
    e.stopPropagation();
    if (surveyidArray.includes(surveyid)) {
      setSurveyIdArray(surveyidArray.filter((id) => id !== surveyid));
    } else if (e.target.checked) {
      setSurveyIdArray([...surveyidArray, surveyid]);
    }
  };
  //--------------check if survey is selected------
  const isChecked = (surveyid) => {
    let surveysarray = surveyidArray;
    let found = false;
    for (let i = 0; i < surveysarray.length; i++) {
      if (surveyid == surveysarray[i]) {
        found = true;
        break;
      }
    }
    return found;
  };

  return (
    <Stack h={"100%"} gap={0}>
      <SurveyHeader
        selectedTeamId={selectedTeamId}
        setSelectedTeamId={setSelectedTeamId}
        filterParam={filterParam}
        setFilterParam={setFilterParam}
        openCreateSurvey={openSurveyTemplates}
        openMergeSurvey={openMergeSurvey}
        sort={sort}
        setSort={setSort}
        surveyCount={surveyidArray.length}
        surveyType={surveyType}
        refetch={refetch}
      />
      <Space h="lg" />
      {surveys?.length > 0 ? (
        <SurveyCardLayout>
          {surveys
            ?.sort((a, b) =>
              sort
                ? new Date(b.createdAt).getTime() -
                  new Date(a.createdAt).getTime()
                : new Date(a.createdAt).getTime() -
                  new Date(b.createdAt).getTime(),
            )
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
              />
            ))}
        </SurveyCardLayout>
      ) : (
        <NothingFound text="No Surveys Found" />
      )}
      <CreateSurveyModal
        open={createSurveyOpened}
        close={closeCreateSurvey}
        surveyType={surveyType}
        teamsData={teamRes?.data}
        template={template}
        setTemplate={setTemplate}
      />
      <SurveyTemplatesModal
        opened={surveyTemplatesOpened}
        close={closeSurveyTemplates}
        openCreateSurvey={openCreateSurvey}
        setTemplate={setTemplate}
        surveyType={surveyType}
      />
      {/* //---------create landing page modal ------------ */}
      <CreateSurveyLandingModal
        open={mergeSurveyOpened}
        close={closeMergeSurvey}
        surveyType={"web"}
        landingPageId={null}
        surveyIdArray={surveyidArray}
        mergeSurvey={true}
      ></CreateSurveyLandingModal>
    </Stack>
  );
}
