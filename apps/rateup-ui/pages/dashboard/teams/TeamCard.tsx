import { Flex, Group,Stack, Menu, Paper, Space, Text,Badge, ActionIcon, useMantineTheme } from '@mantine/core';
import { IconChartBar, IconDots, IconEdit, IconPencil, IconSettings, IconShare, IconTrash } from '@tabler/icons-react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import React, {useEffect, useState} from 'react'
import { deleteTeamById } from '../../../backend/team/team.api';
import { useDeleteTeamMutation } from '../../../backend/team/team.query';
import { notifications } from '@mantine/notifications';

const TeamCard = ({team, reftchTeams}) => {
    const theme = useMantineTheme();
    const router = useRouter();

  return (
    <Paper
      p="md"shadow="lg" radius="lg"
      sx={{ cursor: "pointer", width:"250px", height:"140px" }}
      onClick={() => {
        router.push(`teams/${team.teamId}`);
      }}
    >
      <Flex justify={"space-between"} align={"center"}>
        <Text mr={"sm"} truncate size="xl" fw={700}>
          {team.teamName}
        </Text>
        {/* <Group align={"center"} mt="sm" spacing="xs">
        <IconPencil />
         <TeamMenu reftchTeams={reftchTeams}  team={team} /> 
        </Group> */}
        
      </Flex>
      <Stack  mt="sm" spacing="xs">

      <Group spacing="xs">

        <Text size="sm" c="dimmed">
          Code: 

        </Text>
        <Badge color="blue.9" variant="outline">{team.code} </Badge>
        </Group>


        <Group align={"center"} spacing="xs">
         <Text  fz="sm" c="dimmed">Total Members : </Text>
          <Text fw={500} fz="sm">{team.memberCount}</Text>
        </Group>
      </Stack>
      <Space h="xl" />
      <Space h="lg" />

    </Paper>
  )
}

// function TeamMenu({ reftchTeams, team }) {
//     const [deleteTeamId, setDeleteTeamId] = useState<string>();
//     useEffect(() => {
//         deleteTeamId && deleteTeamMutation.mutate();
//         if (deleteTeamId) {
//             notifications.show({
//                 id: 'load-data',
//                 loading: true,
//                 title: 'Deleting Team..',
//                 message: `Hold on, Your team is getting deleted.`,
//                 autoClose: false,
//                 withCloseButton: false,
//             });

//         }
//     }, [deleteTeamId]);

//     const handleDeleteTeam = async () => {
//         return deleteTeamById(deleteTeamId)
//     };

//     const deleteTeamMutation = useDeleteTeamMutation(handleDeleteTeam, setDeleteTeamId, close, reftchTeams);

//     return (
//       <Menu width={200}>
//         <Menu.Target>
//           <ActionIcon
//             onClick={(e) => {
//               e.stopPropagation();
//             }}
//           >
//             <IconDots />
//           </ActionIcon>
//         </Menu.Target>
//         <Menu.Dropdown
//           onClick={(e) => {
//             e.stopPropagation();
//           }}
//         >
//           <Menu.Item icon={<IconEdit />}>Edit</Menu.Item>
//           <Menu.Item icon={<IconShare />}>Invite</Menu.Item>
//           <Menu.Item icon={<IconSettings />}>Settings</Menu.Item>
//           <Menu.Item
//             icon={<IconTrash />}
//             onClick={(e) =>  {
//                 e.stopPropagation();
//                 setDeleteTeamId(team?.teamId)
//               }}
//           >
//             Delete
//           </Menu.Item>
//         </Menu.Dropdown>
//       </Menu>
//     );
//   }

export default TeamCard