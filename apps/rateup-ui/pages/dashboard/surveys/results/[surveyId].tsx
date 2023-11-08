import React, { useEffect } from "react";
import { useSurvey } from "../../../../backend/surveys/surveys.query";
import { useRouter } from "next/router";
import { Title, Group, Loader } from "@mantine/core";
import { useRouteParams } from "../../../../context/RouteParamsContext";
import Result from "../../../../components/Survey/Result/Result";
import { useUser } from "../../../../context/UserContext";
import { RateupButtonOutline } from "../../../../components/Button/RateupButtons";
import { IconEdit } from "@tabler/icons";

//page made for just view survey results

const ViewResults = () => {
  const router = useRouter();
  const surveyId = router.query.surveyId as string;
  const { user, setUser } = useUser();

  if (Array.isArray(surveyId)) {
    throw new Error("surveyId is an array");
  }

  const {
    isLoading: isSurveyLoading,
    error: surveyError,
    data: survey,
  } = useSurvey(surveyId);

  //Update nav breadcrumb page name
  const { update } = useRouteParams();
  useEffect(() => {
    update({ surveyId: survey?.title });
  }, [survey?.title]);

  if (isSurveyLoading) return <Loader />;
  if (surveyError) {
    return "An error has occurred";
  }

  function editSurvey() {
    router.push(
      `${process.env.NEXT_PUBLIC_FRONTEND_URL}/dashboard/surveys/${survey?.id}`,
    );
  }

  return (
    <>
      <Group>
        <Title pb="xl" mb="xl">
          Survey:{" "}
        </Title>
        <Group pb="xl" mb="xl" pl="lg" ml="lg">
          <Title c={"blue.9"}>{survey?.title}</Title>
          {user?.role !== "MEMBER" && (
            <RateupButtonOutline
              ml="50px"
              onClick={editSurvey}
              title="Edit"
              size="xs"
              leftIcon={<IconEdit />}
            />
          )}
        </Group>
      </Group>
      <Result survey={survey} />
    </>
  );
};

export default ViewResults;
