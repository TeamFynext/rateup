import React, { useState, useEffect } from 'react'
import { Paper, Divider, Text, Grid, TextInput, MultiSelect } from '@mantine/core';
import { RateupButtonSecondary } from '../../Button/RateupButtons';
import { useForm } from "@mantine/form";
import { useEditSurveyMutation } from '../../../backend/surveys/surveys.query';

const GeneralSettings = ({ survey }) => {
    const surveyForm = useForm({
        initialValues: {
            title: "",
            languages: [],
        },
        validate: {
            title: (value) => (value.length ? null : "Cannot be empty"),
            languages: (values) =>
                values.length ? null : "Must contain atleast one language",
        },
    });

    useEffect(() => {
        //console.log("Survey:" + JSON.stringify(survey))
        surveyForm.setValues({
            title: survey?.title || "",
            languages: survey?.languages || "",
        });
    }, [survey])

    const [isLoading, setIsLoading] = useState(false);

    const [languages, setLanguages] = useState([
        { value: 'English', label: 'English' },
        { value: 'Malayalam', label: 'Malayalam' },
        { value: 'Hindi', label: 'Hindi' },
        { value: 'Kannada', label: 'Kannada' },
        { value: 'Tamil', label: 'Tamil' },
    ]);

    const editSurvey = useEditSurveyMutation(survey?.id, setIsLoading);
    const onSubmit = (values) => {
        setIsLoading(true);
        const data = { title: values.title, languages: values.languages };
        editSurvey.mutate(data);
    }
    return (
        <Paper p="xl" sx={{ minHeight: '400px', minWidth: '600px' }}>
            <form onSubmit={surveyForm.onSubmit(onSubmit)}>

                <Grid align='center'>
                    <Grid.Col md={6} lg={4}>
                        <Text size={'md'}>Survey Name: </Text>
                    </Grid.Col>
                    <Grid.Col md={6} lg={4}>
                        <TextInput
                            withAsterisk
                            placeholder="Enter Survey name"
                            required
                            mt="md"
                            {...surveyForm.getInputProps('title')}
                        />
                    </Grid.Col>
                </Grid>
                <Divider my="xl" />
                <Grid align='center'>
                    <Grid.Col md={6} lg={4}>
                        <Text size={'md'}>Languages: </Text>
                    </Grid.Col>
                    <Grid.Col md={6} lg={4}>
                        <MultiSelect
                            withAsterisk
                            placeholder="Type to create new language"
                            searchable
                            creatable
                            // TODO: Add a user-level language list
                            data={languages}
                            getCreateLabel={(query) => `+ Create ${query}`}
                            //@ts-ignore
                            onCreate={(query) => {
                                if (surveyForm.values.languages.includes(query)) return
                                surveyForm.setFieldValue("languages", [...surveyForm.values.languages, query])
                                const item = { value: query, label: query };
                                setLanguages((current) => [...current, item]);
                            }}
                            {...surveyForm.getInputProps("languages")}
                        />
                    </Grid.Col>
                </Grid>


                <Divider my="xl" />

                <Grid justify="flex-end">
                    <Grid.Col span={2}>
                        <RateupButtonSecondary type="submit" loading={isLoading} size='md' title="Save Changes" />
                    </Grid.Col>
                    <Grid.Col span={5}>
                    </Grid.Col>
                </Grid>

            </form>
        </Paper>
    )
}

export default GeneralSettings