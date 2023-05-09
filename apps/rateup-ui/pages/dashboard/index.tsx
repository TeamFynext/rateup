import ButtonComponent from "../../components/Button/ButtonComponent";
import {useDisclosure} from '@mantine/hooks';
import {Box, Modal, TextInput} from '@mantine/core';
import {useEffect, useState} from 'react';
import {notifications} from '@mantine/notifications';
import {IconSquarePlus} from '@tabler/icons';

export default function DashboardHome() {
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
    }

    
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