import ButtonComponent from "../../components/Button/ButtonComponent";
import {useDisclosure} from '@mantine/hooks';
import {Box, Modal, TextInput, Title, Space, Container} from '@mantine/core';
import {useEffect, useState} from 'react';
import {notifications} from '@mantine/notifications';
import {IconSquarePlus} from '@tabler/icons';
import { useRouter } from 'next/router';
import { useQueryClient } from "@tanstack/react-query";
import Loading from "../../components/Page/Loading";
import { useUser } from "../../context/UserContext";

export default function DashboardHome() {
    const [opened, { open, close }] = useDisclosure(false);
    const [name, setName] = useState('');
    const isNameValid = name.length >= 2;

    const router = useRouter();
    const queryClient = useQueryClient();
    const { user } = useUser();

    useEffect(() => {
        if (!user) {
            queryClient.invalidateQueries(['userInfoQuery']);
        }
        console.log("Dashboard Role:" + user?.role);

    }, []);

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
    }

    
    return (
        <>
        <Title order={1}>Dashboard</Title>
        <Space h="xl" />
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

            {
                user ?

                <Container>
        {
           user?.role !== 'ADMIN' && user?.role !== 'SUPER_ADMIN'
            ?                 <ButtonComponent onClick={open} title={"Create Organization"} leftIcon={<IconSquarePlus size="1rem" />} />


            :                 <ButtonComponent onClick={() => router.push('/dashboard/teams')} title={"Teams"}  />

        }

            </Container>

                : <Loading h={300} />
            }

        </>
    );

}