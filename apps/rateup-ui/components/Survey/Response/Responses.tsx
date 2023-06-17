import { useRouter } from "next/router";
import { Loader, Paper, ScrollArea, Table, Text } from "@mantine/core";
import dayjs from "dayjs";
import { useResponses } from "../../../backend/surveys/response/response.query";
import { useQuestions } from "../../../backend/surveys/questions/questions.query";
import { useContext } from "react";
import SelectedLanguageContext from "../../../context/SelectedLanguage";
import { getResponse } from "../../../utils/response";

export function Responses({setResponseCount}) {
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

  setResponseCount(responses?.length)

  const cellGap = {
    paddingLeft: '10px',
    paddingRight: '10px',
    minWidth: '100px'
  };

  // TODO: find a suitable DataGrid component to use instead of Table
  return (
    <Paper p="xl" shadow="lg" radius="lg" >
      <ScrollArea style={{ width: '70vw', height: '50vh' }}>
      <Table highlightOnHover>
        <TableHead questions={questions} />
        <tbody>
          {responses.map((response) => (
            <tr key={response.id}>
              <td style={cellGap}>{dayjs(response.createdAt).format("DD-MM-YYYY")}</td>
              {questions.map((q) => (
                <td key={q.id} style={cellGap}>{getResponse(q.id, response)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </Table>
      </ScrollArea>
    </Paper>
  );
}

interface TableHeadProps {
  questions: Array<Question>;
}
function TableHead({ questions }: TableHeadProps) {
  const { selectedLanguage } = useContext(SelectedLanguageContext);

  if(!questions?.length)
    return <>No Responses. </>
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
