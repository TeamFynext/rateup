import React, {useState, useEffect} from 'react';
import { useRouter } from 'next/router';
import { useResponses } from '../../../backend/surveys/response/response.query';
import { useQuestions } from '../../../backend/surveys/questions/questions.query';
import QuestionPieChart from './Charts/QuestionPieChart';
import QuestionBarChart from './Charts/QuestionBarChart';
import { Container } from '@mantine/core';
import { QuestionType } from '../../../types/enums';
import { Paper, Title, Divider, Stack , Select, ScrollArea} from '@mantine/core';

const ResultsOverview = () => {
  const { surveyId } = useRouter().query as { surveyId: string };
  const [languages, setLanguages] = useState<string[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState('English') 

  const { isLoading, error, data: responses } = useResponses(surveyId);
  const {
    isLoading: isQLoading,
    error: QError,
    data: questions,
  } = useQuestions(surveyId);

  useEffect(() => {
    if(questions){
      const titleMap: Record<string, any> = {};
      const languageSet = new Set<string>();
      for(const question of questions){
        titleMap[question.id] = question.title;
        Object.keys(question.title).forEach(lang => languageSet.add(lang));
      }
      setLanguages(Array.from(languageSet));
      setSelectedLanguage(Array.from(languageSet)[0]);
    }
  }, [responses, questions])

  if (isLoading || isQLoading) {
    return <div>Loading...</div>;
  }

  if (error || QError) {
    return <div>Error </div>;
  }

  
const prepareData = (questions: any[], responses: any[]) => {
  return questions.map(question => {
    const responsesForQuestion = responses?.flatMap(response => 
      response?.responses?.filter((item: any) => item?.questionId === question?.id)
    );

    let promoters = 0;
    let passives = 0;
    let detractors = 0;

    responsesForQuestion.forEach((response: any) => {
      const rating = response?.response[response?.type];

      switch (response?.type) {
        case QuestionType.Rating:
        case QuestionType.Opinion:
          if (rating >= 9) promoters++;
          else if (rating >= 7) passives++;
          else detractors++;
          break;
        case QuestionType.Smiley:
          if (["VeryHappy", "Happy"].includes(rating)) promoters++;
          else if (rating === "Neutral") passives++;
          else detractors++;
          break;
        case QuestionType.LD:
          if (rating === "Like") promoters++;
          else detractors++;
          break;
        case QuestionType.YN:
          if (rating === "Yes") promoters++;
          else detractors++;
          break;
      }
    });

    const total = promoters + passives + detractors;
    const nps = total ? ((promoters - detractors) / total) * 100 : null;


    let localizedTitle = question?.title?.English;
    if (question?.title && question?.title[selectedLanguage]) {
      localizedTitle = question?.title[selectedLanguage];
    }

    let choices = null;
    if (question?.choices && question?.choices[selectedLanguage]) {
      choices = question?.choices[selectedLanguage];
    }

    return { 
      question: question?.title[selectedLanguage],
      choices: choices,
      type: question?.type, 
      responses: responsesForQuestion, 
      nps: {
        score: nps,
        promoters,
        detractors,
        passives,
        total
      } };
  });
};

const chartData = prepareData(questions, responses);


  return (
    <Container fluid size="md">
      
      <Stack>
        <Select 
          data={languages} 
          value={selectedLanguage} 
          onChange={(value) => setSelectedLanguage(value)} 
          label="Select Language" 
          mb="lg"
          style={{maxWidth: "200px"}}
        />


      </Stack>
      <ScrollArea h={'60vh'}>

        <Stack  style={{ marginBottom: '20px' , maxWidth:"1000px"}}>

          
        {chartData.some(item =>
            item.type === QuestionType.Rating ||
            item.type === QuestionType.Smiley ||
            item.type === QuestionType.LD ||
            item.type === QuestionType.YN ||
            item.type === QuestionType.Opinion) && (
            <Title ml="xl" mt="xl" order={2}>NPS Overview</Title>
          )}

        <Paper px="md" shadow="xs" py="xl" style={{ marginBottom: '20px' , maxWidth:"800px"}}>
          {chartData.filter(item =>
            item.type === QuestionType.Rating ||
            item.type === QuestionType.Smiley ||
            item.type === QuestionType.LD ||
            item.type === QuestionType.YN ||
            item.type === QuestionType.Opinion
          ).map((item, index, filteredArray) => (
            <React.Fragment key={index}>
              <QuestionPieChart no={index + 1} type={item.type} 
                responseCount={responses.length} question={item.question} data={item.nps} />
              {index < filteredArray.length - 1 && <Divider my="md"/>}
            </React.Fragment>
          ))}
        </Paper>


          <Title order={2} ml="xl" mt="xl">Question Wise Overview</Title>

          {chartData.filter(item =>
            item.type === QuestionType.Rating ||
            item.type === QuestionType.Smiley ||
            item.type === QuestionType.LD ||
            item.type === QuestionType.YN ||
            item.type === QuestionType.Opinion ||
            item.type === QuestionType.MCQ ||
            item.type === QuestionType.MSQ ||
            item.type === QuestionType.DDSS ||
            item.type === QuestionType.DDMS
          ).map((item, index) => (
            <QuestionBarChart key={index} question={item.question} no={index + 1}
              choices={item.choices} data={item.responses} questionType = {item.type}/>
          ))}
        </Stack>

        </ScrollArea>

    </Container>

  );
};

export default ResultsOverview;
