import React, { useState, useEffect, useRef, useCallback} from 'react'
import { ScrollArea, Loader, Table, Title, Grid, Paper, Text } from "@mantine/core";
import { RateupButtonBlackOutline, RateupButtonSecondary } from '../../Button/RateupButtons';
import { IconChevronDown } from '@tabler/icons-react';
import { useContext } from "react";
import { useResponses } from '../../../backend/surveys/response/response.query';
import { useQuestions } from '../../../backend/surveys/questions/questions.query';
import { useRouter } from "next/router";
import dayjs from 'dayjs';
import { getResponse } from '../../../utils/response';
import SelectedLanguageContext from '../../../context/SelectedLanguage';
import { useDownloadExcel } from 'react-export-table-to-excel';

const Responses = ({ survey }) => {
    const [responseCount, setResponseCount] = useState(0)
    const tableRef = useRef(null);
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

    useEffect(() => {
      setResponseCount(responses?.length);
    }, [responses]);

    const { onDownload } = useDownloadExcel({
      currentTableRef: tableRef.current,
      filename: survey?.title,
      sheet: 'Responses'
  })

    const cellGap = {
      paddingLeft: '10px',
      paddingRight: '10px',
      minWidth: '100px'
    };
  
    if (isLoading || isQLoading) return <Loader />;
    if (error || QError) return <Text>An error has occurred</Text>;

  return (
    <>
    <Grid grow mb={15} align="center">
    <Grid.Col span={3} > 
      <RateupButtonBlackOutline 
        title={"Responses"} 
        size="md"
        radius={"lg"}
        rightIcon={<IconChevronDown
          size="1rem" />}
      />
    </Grid.Col>
    <Grid.Col span={5}>
      <Text fz="xxl" fw={600}>Responses</Text>
    </Grid.Col>
  </Grid>
<Paper p="xl" shadow="lg" radius="lg" sx={{ cursor: "pointer" }} mb={30}>
  <Grid justify="space-between" align="center">
    <Grid.Col span={3}><Title order={2}>Total Responses : {responseCount}</Title></Grid.Col>
          <Grid.Col span={3}>
          <RateupButtonSecondary 
           onClick={onDownload}
          title={"Download"} 
          size="md"
          radius={"lg"}
          rightIcon={<IconChevronDown
            size="1rem" />}/>

          </Grid.Col>
  </Grid>
</Paper>

<Paper p="xl" shadow="lg" radius="lg">
  <ScrollArea style={{ width: '70vw', height: '50vh', overflow: 'auto', position: 'relative' }}>
    <Table highlightOnHover  ref={tableRef}>
      <TableHead questions={questions}  />
      <tbody>
        {responses?.map((response) => (
          <tr key={response.id}>
            <td style={cellGap}>{dayjs(response.createdAt).format("DD-MM-YYYY")}</td>
            {questions.map((q) => (
              <td key={q.id} style={cellGap}>
                {getResponse(q.id, response)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </Table>
  </ScrollArea>
</Paper>


</>
  )
}

export default Responses

interface TableHeadProps {
    questions: Array<Question>;
  }
  function TableHead({ questions }: TableHeadProps) {
    const { selectedLanguage } = useContext(SelectedLanguageContext);
  
    const stickyHeaderStyles: React.CSSProperties = {
      position: 'sticky',
      top: 0,
      zIndex: 100,
      backgroundColor: 'white',
    };
    
    if(!questions?.length)
      return <>No Responses. </>
    return (
      <thead style={stickyHeaderStyles}>
        <tr>
          <th>Date</th>
          {questions.map((q) => (
            <th key={q.id}>{q.title[selectedLanguage]}</th>
          ))}
        </tr>
      </thead>
    );
  }
  