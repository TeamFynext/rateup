import React from 'react'
import { useUser } from '../../../context/UserContext';
import { useRouter } from "next/router";
import { Flex, Title, Grid, Select, Table, Text, Paper, Divider} from '@mantine/core';
import { useTeamsMembersOfOrg, useUpdateRoleMutation } from '../../../backend/org/org.query';

const Members = () => {
  const router = useRouter();
  const { user, setUser } = useUser();

  if(user?.role === 'ADMIN'){
    router.push('/dashboard');
  }

  const {
    isLoading: isLoadingTeamsUser,
    data: teamsDataUser,
    error: errorTeamsDataUser,
    refetch: reftchTeams,
  } = useTeamsMembersOfOrg();

  const updateRole = useUpdateRoleMutation();

  function onChangeRole(id, role){
    const data = { memberId : id, body : { role: role }};
    updateRole.mutate(data);
  }

  const rows = teamsDataUser?.data?.data?.map((team, i) => (
    <tr key={i}>
      <td><Title order={3} >{team?.team_name}</Title></td>

      <td>
        {team?.members?.map((member, j: number) => (
    <>            
          <Grid key={j} sx={{minWidth:"600px"}} py="lg" align='center'>
              <Grid.Col span={3}>{member?.name}</Grid.Col>
              <Grid.Col span={5}>{member?.email}</Grid.Col>
              <Grid.Col span={4}>
              
              <Select
                  placeholder="Select a role"
                  data={[
                    { value: 'SUPER_ADMIN', label: 'Super Admin' },
                    { value: 'ADMIN', label: 'Admin' }
                  ]}
                  value={member?.role}
                  disabled={member?.id === user?.userId}
                  onChange={(value) => onChangeRole(member?.id, value)}
                />
              
            </Grid.Col>
          </Grid>
          {
        (j !== team?.members.length - 1) && <Divider my="sm" variant="dashed" />
      }
           
          </>
        ))}
      </td>
    </tr>
  ));

  return (
    <Flex
    mih={50}
    gap="md"
    justify="space-between"
    align="center"
    direction="row"
    wrap="wrap"
>
    <Flex
        mih={50}
        gap="md"
        justify="flex-start"
        align="flex-start"
        direction="column"
        wrap="wrap"
    >
        <Title order={1}>Members</Title>
        <Text> List of all teams and their members list.</Text>

    <Paper p="md" radius="md">
        <Table horizontalSpacing="xl" 
              verticalSpacing="lg" 
              fontSize="md" 
              mt='lg'
              striped highlightOnHover withBorder withColumnBorders>
          <thead>
            <tr>
              <th> <Text > Teams </Text></th>
              <th> 

              <Grid sx={{minWidth:"600px"}}  >
                <Grid.Col span={3}>Member</Grid.Col>
                <Grid.Col span={5}>Email</Grid.Col>
              <Grid.Col span={4}>Role</Grid.Col>

            </Grid>
              
              </th>
            </tr>
          </thead>
          <tbody>{rows}</tbody>
        </Table>
      </Paper>
    </Flex> 
      </Flex>
  )
}

export default Members