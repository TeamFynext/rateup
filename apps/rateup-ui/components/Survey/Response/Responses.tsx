import React, { useState, useEffect, useRef, } from 'react'
import { ScrollArea,  Loader, Table, Title, Grid, Paper, Text, Modal, Group, 
   Divider, TextInput, Stack  } from "@mantine/core";
import { RateupButtonBlackOutline, RateupButtonBlue, RateupButtonSecondary } from '../../Button/RateupButtons';
import { IconChevronDown, IconTrashXFilled, IconX } from '@tabler/icons-react';
import { useContext } from "react";
import { useQuestions } from '../../../backend/surveys/questions/questions.query';
import { useRouter } from "next/router";
import dayjs from 'dayjs';
import { getResponse } from '../../../utils/response';
import SelectedLanguageContext from '../../../context/SelectedLanguage';
import { useDownloadExcel } from 'react-export-table-to-excel';
import { useDeleteResponse, useResponses } from '../../../backend/surveys/response/response.query';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { useUser } from '../../../context/UserContext';

const Responses = ({ survey }) => {
    const [responseCount, setResponseCount] = useState(0)
    const tableRef = useRef(null);
    const router = useRouter();
    const { surveyId } = router.query as { surveyId: string };
    const [selectedRowId, setSelectedRowId] = useState('')
    const [opened, { open, close }] = useDisclosure(false);
    const [verifyEmail, setVerifyEmail] = useState('')
    const [isDeleteAction, setIsDeleteAction] = useState(false)
    const { user } = useUser();
    const [isDeleting, setIsDeleting] = useState(false)

    const deleteResponse = useDeleteResponse(surveyId, close, setIsDeleting);

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

    const openActions = (id) => {
      // console.log(id)
      selectedRowId === id ? setSelectedRowId('') : setSelectedRowId(id)
      selectedRowId !== id && open()
    }

    useEffect(() => {
      setVerifyEmail('')
      setIsDeleteAction(false)
    }, [opened])
  
    const confirmDelete= () => {
        if(user?.email === verifyEmail){
            notifications.show({
                id: 'load-data',
                loading: true,
                title: 'Deleting Response',
                message: `Hold on, response is getting deleted...`,
                autoClose: false,
                withCloseButton: false,
            });
            setIsDeleting(true)
            deleteResponse.mutate(selectedRowId)
        }else{
            notifications.show({
                id: "load-data",
                color:  "red",
                title:  "Error",
                message: "Incorrect email",
                icon: <IconX size="1rem" />,
                autoClose: 3000,
            });
        }
    }
  
    if (isLoading || isQLoading) return <Loader />;
    if (error || QError) return <Text>An error has occurred</Text>;

  return (
    <>
    <Grid grow mb={15} align="center">
    <Grid.Col span={3} > 
      {/* <RateupButtonBlackOutline 
        title={"Responses"} 
        size="md"
        radius={"lg"}
        rightIcon={<IconChevronDown
          size="1rem" />}
      /> */}
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
          <tr key={response.id} onClick={() => openActions(response.id)}
          style={{
            backgroundColor: selectedRowId === response.id ? 'silver' : '',
          }}
          >
            <td style={cellGap}> <Text color="dark.3">{dayjs(response.createdAt).format("DD-MM-YYYY")} </Text></td>
            {questions.map((q) => (
              <td key={q.id} style={cellGap}  title={getResponse(q.id, response)} >
                <Text color="dark.3" truncate="end" sx={{maxWidth:"150px"}}> {getResponse(q.id, response)} </Text>
                
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </Table>
  </ScrollArea>
  <Modal opened={opened} onClose={close} title="Response Actions" centered>
        
        {
          !isDeleteAction  && <Group py="xl">
                                <RateupButtonBlackOutline leftIcon={<IconTrashXFilled />} title='Delete Response' 
                                onClick={() => setIsDeleteAction(true)} />
                              </Group>
        }
       

            <Stack sx={{ display: isDeleteAction ? 'block' : 'none'}}>
            <Divider  pb="2rem"/>

            <Text  fz="lg"> Delete this Reponse </Text>
            <Text color='red'>
                Once deleted, response entry data will be lost.
            </Text>

            <Stack pt="xl">
                <Text>
                    To proceed further, type in your email id and click confirm delete.
                </Text>
                <TextInput
                    sx={{maxWidth:"300px"}}
                    withAsterisk
                    label="Verify email"
                    placeholder="Enter your login email"
                    required
                    mt="md"
                    value={verifyEmail}
                    onChange={(e) => setVerifyEmail(e.target.value)}
                
                />
                
            </Stack>

            <Group mt="xl" pt="xl">

                <RateupButtonSecondary onClick={close} title="Close"/>
                <RateupButtonBlue onClick={confirmDelete} title="Confirm" loading={isDeleting}/>

            </Group>

            </Stack>
  </Modal>
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
          <th><Text fz="sm" color="dark.9" fw="400">Date</Text></th>
          {questions.map((q) => (
            <th key={q.id} title={ q.title[selectedLanguage] || q.title['English'] }>
              <Text  color="dark.9" fz="sm" fw="400" truncate="end" sx={{maxWidth:"150px"}}>
                   {q.title[selectedLanguage] || q.title['English']}
              </Text>
              </th>
          ))}
          {/* TODO : above 'English' given as a temporary fix,
           change default language for page survey/response/id */}
        </tr>
      </thead>
    );
  }
  