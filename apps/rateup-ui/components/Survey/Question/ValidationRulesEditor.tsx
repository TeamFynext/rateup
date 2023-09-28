import React, {useState, useEffect} from 'react'
import { QuestionTabsEnum } from '../EditSurvey';
import { Paper, Divider, TextInput, Select , useMantineTheme, Group, Title, Stack, ScrollArea, Text, SimpleGrid, Button, ActionIcon } from "@mantine/core";
import { RateupButtonSecondary } from '../../Button/RateupButtons';
import { notifications } from '@mantine/notifications';
import { IconInfoCircle, IconTrash, IconX } from '@tabler/icons-react';
import {
  QuestionType as Q,
  SmileyResponse,
} from "../../../types/enums";
import { useQuestionUpdateMutation } from '../../../backend/surveys/questions/questions.query';
import { useRouter } from "next/router";
import { useForm } from '@mantine/form';

interface IProps {
  selectedQ: Question;
  setSelectedQ: (Q: Question) => void;
  setActiveTab: (tab: QuestionTabsEnum) => void;
}

type RuleValue = {
  min: string;
  max: string;
  errorMessage: string;
} | {
  type: string;
  errorMessage: string;
};

type FormValues = {
  [ruleType: string]: RuleValue;
};

type ChangeHandler = (value: string | RuleValue) => void;

const ValidationRulesEditor = ({
    selectedQ,
    setSelectedQ,
    setActiveTab,
  }: IProps) => {
    const { surveyId } = useRouter().query as { surveyId: string };
    const [linkUpdateStatus, setLinkUpdateStatus] = useState(false)
    const [isSaving, setIsSaving] = useState(false);
    const { colors } = useMantineTheme()

    const [ruleList, setRuleList] = useState( ['length', 'wordCount', 'textType'])

    const questionUpdateMutation = useQuestionUpdateMutation({surveyId, setIsSaving});

    const form = useForm<FormValues>({
      initialValues: {},
      validate: (values) => {
        const errors = {};
      
        for (const ruleType of Object.keys(values)) {
          const ruleData = values[ruleType] as RuleValue;
      
          if ('min' in ruleData && !ruleData.min) {
            errors[`${ruleType}.min`] = 'Required';
          }
          if ('max' in ruleData && !ruleData.max) {
            errors[`${ruleType}.max`] = 'Required';
          }
          if ('type' in ruleData && !ruleData.type) {
            errors[`${ruleType}.type`] = 'Required';
          }
          if (!ruleData.errorMessage) {
            errors[`${ruleType}.errorMessage`] = 'Required';
          }
        }
      
        return errors;
      },
      
    });
  
    const { values, setFieldValue, setValues, errors } = form;

  useEffect(() => {
      switch (selectedQ?.type) {
        case Q.Text:
          setRuleList(['length', 'wordCount', 'textType'])
          break;
        case Q.TextArea:
          setRuleList(['length', 'wordCount', 'textType'])
          break;
        case Q.Number:
          setRuleList(['length'])
          break;
      }
    
  }, [selectedQ]);

  const updateValidationRules = (validationRules: any) => {
    selectedQ && setSelectedQ({ ...selectedQ, validationRules})
    selectedQ &&  console.log({ ...selectedQ, validationRules})
   };


    useEffect(() => {
      let validationResult = form.validate()

      if (validationResult?.hasErrors) {
        // There are validation errors, do not save the form
        return;
      }else{
        let validationRules = null;
        validationRules = { ...form.values};
        updateValidationRules(validationRules);
      }
    }, [values]);

    useEffect(() => {
      if(selectedQ?.hasOwnProperty('validationRules') && selectedQ?.validationRules !== null){
        const updatedValues = { ...selectedQ?.validationRules };
        form.reset()
        setValues(updatedValues)
      }else{
        form.reset()
      }
     }, [selectedQ?.id]);
  
    const addRule = (ruleType: string) => {
      if (ruleType === 'textType') {
        setFieldValue(ruleType, { type: "Letters_&_Numbers", errorMessage: `Letters_&_Numbers only allowed.` });
      }else if (ruleType === 'wordCount') {
        setFieldValue(ruleType, { min: "2", max: "15", errorMessage: "Input should contain minimum 2 words" });
      }
       else {
        setFieldValue(ruleType, { min: "3", max: "50", errorMessage: "Input Length should be between 3 and 50 characters" });
      }
    };

    const deleteRule = (ruleType: string) => {
      const updatedValues = { ...values };
      delete updatedValues[ruleType];
      form.reset()
      setValues(updatedValues)
    }; 

  const handleSave = async () => {
      const validationResult = form.validate();

      if (validationResult?.hasErrors) {
          // There are validation errors, do not save the form
          return;
      }else{
        notifications.show({
          id: 'load-data',
          loading: true,
          title: 'Saving validations',
          message: `Hold on, your changes are getting updated...`,
          autoClose: false,
          withCloseButton: false,
        });

        const data =  { validationRules: { ...form.values }};
        // console.log(data)

        await questionUpdateMutation.mutateAsync({
          qId: selectedQ.id,
          data: { validationRules: selectedQ?.validationRules },
        });
  
        setActiveTab(QuestionTabsEnum.Edit);

      }

  }


  return (
    <Stack justify="space-between" style={{height:'100%'}}>
      <Stack>
         <Title order={3}>Validation Editor</Title>
         <Text color="gray"> Add validation rules to the user input for this question.</Text>
         <Divider />
      </Stack>
    
    <Paper  style={{ minHeight: '300px', minWidth: '650px', maxWidth: '650px' }}>
    <ScrollArea h={400}>
      <form>
    {Object.entries(values).map(([ruleType, ruleValues]) => {
      const ruleData = ruleValues as RuleValue;
      
      return (
        <div key={ruleType}>
          <Group align="center" mb="sm"  px="lg" py="sm" style={{ backgroundColor: colors.blue[0], borderRadius: "12px", }}>

          <Title order={4} style={{ maxWidth: '100px', minWidth: '100px'}}>
            {ruleType}
            
          </Title>
          {('min' in ruleData && 'max' in ruleData) ? (
            <>
            <Group>
              <TextInput
                  style={{ maxWidth: '100px'}}
                  label="Min"
                  value={ruleData.min}
                  onChange={(event) => {
                    const newValue: RuleValue = {
                      ...(ruleData as RuleValue),
                      min: event.target.value,
                    };
                    setFieldValue(ruleType, newValue);
                  }}
                  required
                  error={errors[`${ruleType}.min`]}
                />
                <TextInput
                  label="Max"
                  style={{ maxWidth: '100px'}}
                  value={ruleData.max}
                  onChange={(event) => {
                    const newValue: RuleValue = {
                      ...(ruleData as RuleValue),
                      max: event.target.value,
                    };
                    setFieldValue(ruleType, newValue);
                  }}
                  required
                  error={errors[`${ruleType}.max`]}
                />
                </Group>
            </>
          ) : (

            <Select
              label="Input type:"
              placeholder="Select rule type"
              data={['Letters', 'Letters_&_Numbers']}
              defaultValue="Letters_&_Numbers"
              onChange={(event) => {
                    const newValue: RuleValue = {
                      ...(ruleData as RuleValue),
                      type: event,
                      errorMessage:  `${event} only allowed.`,
                    };
                    setFieldValue(ruleType, newValue);
                  }}
              error={errors[`${ruleType}.type`]}
            />
          )}
              <TextInput
              style={{ maxWidth: '300px'}}
            label="Error Message"
            value={ruleData.errorMessage}
            onChange={(event) => {
              const newValue: RuleValue = {
                ...(ruleData as RuleValue),
                errorMessage: event.target.value,
              };
              setFieldValue(ruleType, newValue);
            }}
            required
            error={errors[`${ruleType}.errorMessage`]}
          />

    <Group  px="xl">
      <ActionIcon
        style={{ position: "absolute", right: "20px" }}
        onClick={() => deleteRule(ruleType)}
      >
        <IconTrash color={colors.red[5]} />
      </ActionIcon>
      </Group>

</Group>
        </div>
      );
    })}

{ 
 Object.keys(values).length < 3 && (
    <Group p="md" mt="xl" style={{ maxWidth: '350px', backgroundColor: colors.yellow[0], borderRadius: "12px" }}>
      <Title order={4} style={{ maxWidth: '120px' }}>Add Rule :</Title>
      <Select
        placeholder="Select rule type"
        data={
          ruleList?.filter(ruleType => !(ruleType in values))
        }
        onChange={(ruleType) => addRule(ruleType)}
      />
    </Group>
  )
}
    
      </form>
    </ScrollArea>
      
    </Paper>

    <Group justify="space-between">
        <RateupButtonSecondary
            title={"Cancel"}
            size="md"
            onClick={() => setActiveTab(QuestionTabsEnum.Edit)}
          />
          <RateupButtonSecondary 
            title={"Save"}
            size="md"
            onClick={handleSave}
            loading={isSaving}
          />
      </Group>

    </Stack>
  )
}

export default ValidationRulesEditor