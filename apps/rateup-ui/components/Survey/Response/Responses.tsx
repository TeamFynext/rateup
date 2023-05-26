import { useRouter } from "next/router";
import { Loader, Paper, Table, Text } from "@mantine/core";
import dayjs from "dayjs";
import { useResponses } from "../../../api/surveys/response/response.query";
import { useQuestions } from "../../../api/surveys/questions/questions.query";
import { useContext } from "react";
import SelectedLanguageContext from "../../../context/SelectedLanguage";
import { getResponse } from "../../../utils/response";

export function Responses() {
  const router = useRouter();
  const { surveyId } = router.query;
  // TODO: find out why surveyId is an array
  if (Array.isArray(surveyId)) {
    throw new Error("surveyId is an array");
  }
  const { isLoading, error, data: responses } = useResponses(surveyId);
  const {
    isLoading: isQLoading,
    error: QError,
    data: questions,
  } = useQuestions(surveyId);

  if (isLoading || isQLoading) return <Loader />;
  if (error || QError) return <Text>An error has occurred</Text>;

  // TODO: find a suitable DataGrid component to use instead of Table
  return (
    <Paper>
      <Table highlightOnHover>
        <TableHead questions={questions} />
        <tbody>
          {responses.map((response) => (
            <tr key={response.id}>
              <td>{dayjs(response.createdAt).format("DD-MM-YYYY")}</td>
              {questions.map((q) => (
                <td key={q.id}>{getResponse(q.id, response)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </Table>
    </Paper>
  );
}

interface TableHeadProps {
  questions: Array<Question>;
}
function TableHead({ questions }: TableHeadProps) {
  const { selectedLanguage } = useContext(SelectedLanguageContext);

  return (
    <thead>
      <tr>
        <th>Date</th>
        {questions.map((q) => (
          <th key={q.id}>{q.title[selectedLanguage]}</th>
        ))}
      </tr>
    </thead>
  );
}
