import React, { useEffect, useState } from 'react';
import { useRouter } from "next/router";
import { useQuestions } from '../../../backend/surveys/questions/questions.query';
import { Paper, Rating, Text, Group, Select , Chip, Stack, Button} from '@mantine/core';
import { IconThumbDownFilled, IconThumbUpFilled } from '@tabler/icons-react';
import { useResponses } from '../../../backend/surveys/response/response.query';

type ResponseCounts = Record<string, Record<string, number>>;

// count responses
const countResponses = (surveyResponses: any) => {
  const counts = {};
  const responseTypeMap = {};

  const validResponseTypes = ['Rating', 'Multiple Choice', 'Opinion Scale', 'Like or Dislike', 'Yes or No', 'Multiple Select'];

  for (const response of surveyResponses) {
    for (const question of response.responses) {
      const questionId = question.questionId;
      const responseType = question.type;
      let responseValue = question.response[responseType];

      if (!validResponseTypes.includes(responseType)) continue;

      if (!counts[questionId]) {
        counts[questionId] = {};
      }

      if (responseType === 'Multiple Select') {
        if (typeof responseValue === 'string') {
          responseValue = responseValue.split(',');
        } else if (Array.isArray(responseValue)) {
          // do nothing, it's already in the correct format
        } else {
          console.error(`Invalid format for 'Multiple Select' responseValue: ${responseValue}`);
          continue;
        }

        for (const option of responseValue) {
          const trimmedOption = option.trim();
          counts[questionId][trimmedOption] = (counts[questionId][trimmedOption] || 0) + 1;
        }
      } else {
        counts[questionId][responseValue] = (counts[questionId][responseValue] || 0) + 1;
      }

      responseTypeMap[questionId] = responseType;
    }
  }

  return {counts, responseTypeMap};
}


const SurveySummary = () => {
  const router = useRouter();
  const { surveyId } = router.query;

  if (Array.isArray(surveyId)) {
    throw new Error("surveyId is an array");
  }

  const { isLoading, error, data: responseData } = useResponses(surveyId);
  const {
    isLoading: isQLoading,
    error: QError,
    data: questions,
  } = useQuestions(surveyId);

  const [responseCounts, setResponseCounts] = useState<ResponseCounts>({});
  const [responseTypeMap, setResponseTypeMap] = useState<Record<string, string>>({});
  const [questionTitleMap, setQuestionTitleMap] = useState<Record<string, any>>({});
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [languages, setLanguages] = useState<string[]>([]);

  useEffect(() => {
    if(responseData){
      const {counts, responseTypeMap} = countResponses(responseData);
      setResponseCounts(counts);
      setResponseTypeMap(responseTypeMap);
    }

    if(questions){
      const titleMap: Record<string, any> = {};
      const languageSet = new Set<string>();
      for(const question of questions){
        titleMap[question.id] = question.title;
        Object.keys(question.title).forEach(lang => languageSet.add(lang));
      }
      setQuestionTitleMap(titleMap);
      setLanguages(Array.from(languageSet));
      setSelectedLanguage(Array.from(languageSet)[0]);
    }
  }, [responseData, questions])

  if (isLoading || isQLoading) return <div>Loading...</div>
  if (error || QError) return <div>Error occurred</div>

  return (
    <div>
      <Select 
        data={languages} 
        value={selectedLanguage} 
        onChange={(value) => setSelectedLanguage(value)} 
        label="Select Language" 
        mb="lg"
        sx={{maxWidth: "200px"}}
      />
    {Object.entries(responseCounts).map(([questionId, responseCounts]) => {
      const totalResponses = Object.values(responseCounts).reduce((a, b) => a + b, 0);
      return (
        <Paper key={questionId} p="lg" style={{ marginBottom: '20px' }}>
          <Text weight={700} mb="sm">{questionTitleMap[questionId][selectedLanguage]}</Text>
          {Object.entries(responseCounts).map(([response, count]) => {
            const percentage = ((count / totalResponses) * 100).toFixed(2);
            const voteText = count > 1 ? 'votes' : 'vote';

            switch(responseTypeMap[questionId]) {
              case 'Opinion Scale':
                return (
                    <Group key={response} pb="sm">
                    <Chip color="indigo" variant="light" sx={{minWidth: "60px"}}>
                      <b>{response} </b>
                    </Chip>
                    :

                    <Text pl="sm">  {count} {voteText} ( {percentage}% )</Text>
                    
                  </Group>
                );
              case 'Multiple Choice':
                return (
                  <Group key={response} pb="sm">
                    <Chip color="indigo" variant="light" sx={{minWidth: "120px"}}>
                      {response} 
                    </Chip>
                    :

                    <Text pl="sm">  {count} {voteText} ( {percentage}% )</Text>
                    
                  </Group>
                );
              case 'Rating':
                return (
                  <Group key={response}>
                    <Rating value={parseInt(response)} readOnly />
                    <Text>({count} {voteText})</Text>
                  </Group>
                );

              case 'Like or Dislike':
                return (
                  <Group key={response}>
                    {
                      response === 'Like' 
                      ? <Group align='center' mb="sm">  <Button
                      color={"teal"}
                      size="sm"
                      px="md"
                      radius="md"
                      leftIcon={<IconThumbUpFilled /> }
                      disabled
                    >
                    Like ({count})
                  </Button> 
                  
                  {percentage}% 
                  
                  </Group>
                       
                      : <Group align='center'>                       <Button
                      color={"red"}
                      size="sm"
                      px="md"
                      radius="md"
                      leftIcon={<IconThumbDownFilled /> }
                      disabled
                    >
                    Dislike ({count})
                  </Button>  {percentage}% </Group>

                    }
                      
                  </Group>
                );

              case 'Yes or No':
                return (
                  <Group key={response}>
                    {
                      response === 'Yes' 
                      ?
                    <Group align='center'  mb="sm"
                    >
                        <Button
                          color={"red"}
                          size="sm"
                          px="md"
                          radius="md"
                          disabled
                        >
                        Yes ({count})
                      </Button>

                      {percentage}% </Group>
                      :

                      <Group align='center'>
                      <Button
                        color={"red"}
                        size="sm"
                        px="md"
                        radius="md"
                        disabled
                      >
                      No ({count})
                    </Button>

                    {percentage}% </Group>
                    }
                      
                  </Group>
                );

                case 'Multiple Select':
                  return (
                    <span key={response}>
                      <Group pb="sm">
                        <Chip color="indigo" variant="light" sx={{minWidth: "120px"}}>
                          {response} 
                        </Chip>
                        :
                        <Text pl="sm">  {count} {voteText} ( {percentage}% )</Text>
                      </Group>
                    </span>
                  );
                
              default:
                return (
                  <div key={response}>
                    <Text>{response} : {count} {voteText}</Text>
                  </div>
                );
            }
          })}

        </Paper>
      );
    })}
    </div>
  )
}

export default SurveySummary;
