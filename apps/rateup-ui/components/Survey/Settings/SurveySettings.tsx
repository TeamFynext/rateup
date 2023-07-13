import React from 'react'
import { Tabs } from '@mantine/core';
import StyledTabs from '../../../pages/dashboard/settings/account/StyledTabs';
import GeneralSettings from './GeneralSettings';
import { PasswordProtection } from './PasswordSettings';

const SurveySettings = ({ surveyId, survey }) => {
    return (
        <StyledTabs defaultValue="settings" >

            <Tabs.List mb="md" pb="md">
                <Tabs.Tab value="settings" >
                    General Settings
                </Tabs.Tab>
                <Tabs.Tab value="general">
                    Password Protection
                </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="settings" >
                <GeneralSettings survey={survey} />
            </Tabs.Panel>

            <Tabs.Panel value="general">
                <PasswordProtection surveyId={surveyId} isProtected={survey?.isProtected} />
            </Tabs.Panel>

        </StyledTabs>
    )
}

export default SurveySettings