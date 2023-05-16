import ButtonComponent from "../../components/Button/ButtonComponent";
import { Flex } from '@mantine/core';
import { IconSquarePlus } from '@tabler/icons';
import { useSessionContext } from "supertokens-auth-react/recipe/session";
import { Box, Modal, TextInput } from '@mantine/core';
import { useEffect, useState } from 'react';
import { notifications } from '@mantine/notifications';
import { useDisclosure } from '@mantine/hooks';
import { useMutation } from "@tanstack/react-query";
import { IconCheck } from '@tabler/icons-react';
import { getOrgIdRole, getUserID } from "../../utils/userInfo"
import { createTeam } from "../../api/team/team.api";

export default function Teams() {
    const sessionContext = useSessionContext();
    const [opened, { open, close }] = useDisclosure(false);
    const [name, setName] = useState('');
    const isNameValid = name.length >= 2;

    useEffect(() => {
        setName('')
    }, [opened])

    const handleCreateTeam = async () => {
        const { orgId } = await getOrgIdRole()
        const { userId } = await getUserID()
        const data = { name, orgId, userId }

        return createTeam(data)
    };

    const addResourceMutation = useMutation(() => handleCreateTeam(), {
        onSuccess: () => {
            notifications.update({
                id: 'load-data',
                color: 'teal',
                title: 'Success',
                message: 'Team created successfully.',
                icon: <IconCheck size="1rem" />,
                autoClose: 3000,
            });
            close()
        },

        onError: (error: Error) => {
            console.error("Error creating the post:", error.message);
            notifications.update({
                id: 'load-data',
                color: 'red',
                title: 'Failed',
                message: error.message,
                icon: <IconCheck size="1rem" />,
                autoClose: 3000,
            });
        },
    });

    const handleSubmit = async () => {
        notifications.show({
            id: 'load-data',
            loading: true,
            title: 'Creating Team..',
            message: `Hold on, Your team '${name}' is getting created.`,
            autoClose: false,
            withCloseButton: false,
        });
        addResourceMutation.mutate();
    }

    if (sessionContext.loading === true) {
        return null;
    }
    return (
        <><Modal opened={opened} onClose={close} title="Create Team" centered>
            <Box>
                <TextInput
                    required
                    label="Name"
                    placeholder="Enter team name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                />
            </Box>
            <Box pt={20} >
                <ButtonComponent onClick={handleSubmit}
                    title={"Create"} disabled={!isNameValid} />
            </Box>
        </Modal>
            <Flex
                gap="xl"
                justify="flex-start"
                align="center"
                direction="row"
                wrap="wrap"
            >
            <h2>Teams</h2>
                <ButtonComponent
                    onClick={open}
                    title={"Create Team"}
                    leftIcon={<IconSquarePlus
                        size="1rem" />} />
            </Flex >
        </>
    );
}