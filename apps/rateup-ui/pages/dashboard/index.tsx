import ButtonComponent from "../../components/Button/ButtonComponent";
import { useDisclosure } from '@mantine/hooks';
import { Modal } from '@mantine/core';
import { Input, Box } from '@mantine/core';

export default function DashboardHome() {

    const [opened, { open, close }] = useDisclosure(false);

    return (
        <>
            <Modal opened={opened} onClose={close} title="Create Organization" centered>
                <Input.Wrapper label="Title" required maw={320} mx="auto">
                    <Box>
                        <Input<any> placeholder="Your organization name" />
                    </Box>
                    <Box pt={20}>
                        <ButtonComponent title={"Create"} />
                    </Box>
                </Input.Wrapper>
            </Modal>
            <span onClick={open} >
                <ButtonComponent title={"Create Organization"} />
            </span>
        </>
    );

}