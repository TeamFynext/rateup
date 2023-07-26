import React, {useState, useEffect } from 'react'
import { Flex, Group, Paper, Space, Text,Badge, useMantineTheme, Menu, ActionIcon } from '@mantine/core';
import { IconCheck, IconDots, IconPencil, IconTrash} from '@tabler/icons-react';
import { useRouter } from 'next/router';
import { deleteInviteById } from '../../../backend/team/team.api';
import { notifications } from '@mantine/notifications';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const TeamMemberCard = ({member}) => {
    const theme = useMantineTheme();
    const router = useRouter();

  return (
    <Paper
    p="md"shadow="lg" radius="lg"
    sx={{ cursor: "pointer" }}
    onClick={() => {
      //router.push(`teams/member/${member.id}`);
    }}
  >
    <Flex justify={"space-between"} align={"center"}>
      <Text mr={"sm"} truncate size="xl" fw={700}>
        {member.name}
      </Text>
      <Group align={"center"} mt="sm" spacing="xs">
      {/* <IconPencil /> */}
       <TeamMemberMenu status={member.status} inviteId={member.id} /> 
      </Group>
      
    </Flex>

    <Space h="xl" />

    <Flex justify={"flex-end"} mt="xl"  align={"center"}>
        <Group spacing="4px">
            <Badge  color={ member.status === "PENDING" ? "yellow" : "green"}> {member.status} </Badge>
        </Group>
    </Flex>
  </Paper>
  )
}

export default TeamMemberCard


function TeamMemberMenu({ status, inviteId }) {
    const [deleteInviteId, setDeleteInviteId] = useState('')
    const queryClient = useQueryClient()

    useEffect(() => {
        deleteInviteId && deleteInviteMutation.mutate();
        if (deleteInviteId) {
            notifications.show({
                id: 'load-data',
                loading: true,
                title: 'Deleting Invite..',
                message: `Hold on, Member invite is getting deleted.`,
                autoClose: false,
                withCloseButton: false,
            });
    
        }
    }, [deleteInviteId]);

    const handleDeleteInvite = async () => {
        return deleteInviteById(deleteInviteId)
    };

    const deleteInviteMutation = useMutation(() => handleDeleteInvite(), {
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['teamsDetailsQuery'] }),  //update team list on delete
                notifications.update({
                    id: 'load-data',
                    color: 'teal',
                    title: 'Success',
                    message: 'Invite deleted successfully.',
                    icon: <IconCheck size="1rem" />,
                    autoClose: 3000,
                });
            close()
            setDeleteInviteId('')
        },

        onError: (error: Error) => {
            console.error("Error :", error.message);
            notifications.update({
                id: 'load-data',
                color: 'red',
                title: 'Failed',
                message: error.message,
                icon: <IconCheck size="1rem" />,
                autoClose: 3000,
            });
            setDeleteInviteId('')

        },

    })

    return (
      <Menu width={200}>
        <Menu.Target>
          <ActionIcon
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <IconDots />
          </ActionIcon>
        </Menu.Target>
        <Menu.Dropdown
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
            {status === 'PENDING' &&
                <Menu.Item
                    icon={<IconTrash />}
                    onClick={(e) =>  {
                        e.stopPropagation();
                        setDeleteInviteId(inviteId)
                    }}
                >
                    Delete Invite
                </Menu.Item>
          }
        </Menu.Dropdown>
      </Menu>
    );
  }