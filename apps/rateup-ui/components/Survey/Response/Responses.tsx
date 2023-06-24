import React, { useState } from 'react'
import { ScrollArea, Group, Loader, Table , Title,  Grid, Paper, Text, ActionIcon, Tooltip, Input } from "@mantine/core";
import { RateupButtonBlackOutline } from '../../Button/RateupButtons';
import { IconChevronDown, IconSearch, IconShare3 } from '@tabler/icons-react';
import { useContext } from "react";
import { useResponses } from '../../../backend/surveys/response/response.query';
import { useQuestions } from '../../../backend/surveys/questions/questions.query';
import { useRouter } from "next/router";
import dayjs from 'dayjs';
import { getResponse } from '../../../utils/response';
import SelectedLanguageContext from '../../../context/SelectedLanguage';


const Responses = () => {
    const [responseCount, setResponseCount] = useState(0)

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
    
  const cellGap = {
    paddingLeft: '10px',
    paddingRight: '10px',
    minWidth: '100px'
  };
  return (
    <>
    <Grid grow mb={15} align="center">
    <Grid.Col span={3} > 
      <RateupButtonBlackOutline 
        title={"Responses"} 
        size="md"
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
      <Group>
      <Input
          icon={<IconSearch size={16} />}
          variant="filled"
          placeholder="Search responses"
          radius="xl"
          size="sm"
          styles={(theme) => ({
            input: {
              borderColor: theme.colors.yellow[theme.fn.primaryShade()],
              borderWidth: 1,
              borderStyle: 'solid',
            },
          })}
        />
    <Tooltip label="Share">
        <ActionIcon variant="default"><IconShare3 size="2rem" /></ActionIcon>
      </Tooltip>
      </Group>

  </Grid.Col>
  </Grid>
</Paper>

<Paper p="xl" shadow="lg" radius="lg">
  <ScrollArea style={{ width: '70vw', height: '50vh', overflow: 'auto', position: 'relative' }}>
    <Table highlightOnHover>
      <TableHead questions={questions}  />
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
  