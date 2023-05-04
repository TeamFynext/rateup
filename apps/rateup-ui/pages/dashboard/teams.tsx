import ButtonComponent from "../../components/Button/ButtonComponent";
import { Flex } from '@mantine/core';
import { IconSquarePlus } from '@tabler/icons';

export default function Teams(){
    return (
        <>
            <Flex
                gap="xl"
                justify="flex-start"
                align="center"
                direction="row"
                wrap="wrap"
            >
            <h2>Teams</h2>
                <ButtonComponent title={"Create Team"} leftIcon={<IconSquarePlus size="1rem" />} />
            </Flex >
        </>
    );

}