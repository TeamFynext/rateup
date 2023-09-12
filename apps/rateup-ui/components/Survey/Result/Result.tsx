import React from 'react'
import StyledTabs from '../../../pages/dashboard/settings/account/StyledTabs';
import { Tabs } from '@mantine/core';
import Responses from '../Response/Responses';
import SurveyStats from './SurveyStats';
import SurveySummary from './SurveySummary';
import ResultsOverview from './ResultsOverview';

const Result = ({survey}) => {
  return (
    <StyledTabs defaultValue="stats" >

    <Tabs.List mb="md" pb="md">
    <Tabs.Tab value="stats" >
            Stats
        </Tabs.Tab>
      <Tabs.Tab value="summary" >
              Summary
        </Tabs.Tab>
         <Tabs.Tab value="result" >
              Result
        </Tabs.Tab>

        <Tabs.Tab value="responses">
            Responses
        </Tabs.Tab>
    </Tabs.List>

    <Tabs.Panel value="summary">
        <SurveySummary/>
      </Tabs.Panel>
      <Tabs.Panel value="result">
        <ResultsOverview />
      </Tabs.Panel>
    <Tabs.Panel value="stats">
        <SurveyStats survey={survey} />
      </Tabs.Panel>

    <Tabs.Panel value="responses" >
        <Responses survey={survey}/>
    </Tabs.Panel>



</StyledTabs>
  )
}

export default Result