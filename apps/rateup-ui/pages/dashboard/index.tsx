import ButtonComponent from "../../components/Button/ButtonComponent";
import { useDisclosure } from '@mantine/hooks';
import { Modal } from '@mantine/core';
import { Box, TextInput, } from '@mantine/core';
import { useEffect, useState } from 'react';
import { useUser } from "@supabase/auth-helpers-react";
import { notifications } from '@mantine/notifications';
import { IconCheck, IconCircleX } from '@tabler/icons-react';
import { IconSquarePlus } from '@tabler/icons';

export default function DashboardHome() {
    const user = useUser()
    const [opened, { open, close }] = useDisclosure(false);
    const [name, setName] = useState('');
    const isNameValid = name.length >= 2;

    useEffect(() => {
        setName('')
    }, [opened])

    const handleSubmit = async () => {

        notifications.show({
            id: 'load-data',
            loading: true,
            title: 'Creating organization..',
            message: `Hold on, Your organization '${name}' is getting created.`,
            autoClose: false,
            withCloseButton: false,
        });

        const response = await fetch('/api/org/create', {
            method: 'POST',
            body: JSON.stringify({ name, user_id: user?.id }),
            headers: {
                'Content-Type': 'application/json',
            },
        });

        const { error } = await response.json();

        if (response.ok) {
            notifications.update({
                id: 'load-data',
                color: 'teal',
                title: 'Success',
                message: `Organization : '${name}' created successfully...!}`,
                icon: <IconCheck size="1rem" />,
                autoClose: 4000,
            });
            close();
        } else {
            notifications.update({
                id: 'load-data',
                color: 'red',
                title: 'Failed..!',
                message: `${error}`,
                icon: <IconCircleX size="1rem" />,
                autoClose: 4000,
            });

        }
    };

    return (
        <>
            <Modal opened={opened} onClose={close} title="Create Organization" centered>
                <Box>
                    <TextInput
                        required
                        label="Name"
                        placeholder="Enter organization name"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                    />
                </Box>
                <Box pt={20} >
                    <ButtonComponent onClick={handleSubmit} title={"Create"} disabled={!isNameValid} />
                </Box>
            </Modal>

            <span onClick={open}  >
                <ButtonComponent title={"Create Organization"} leftIcon={<IconSquarePlus size="1rem" />} />
            </span>
        </>
    );

}