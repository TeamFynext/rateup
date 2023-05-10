import ButtonComponent from "../../components/Button/ButtonComponent";
import { Flex } from '@mantine/core';
import { IconSquarePlus } from '@tabler/icons';
import { useSessionContext } from "supertokens-auth-react/recipe/session";

export default function Teams(){

    const sessionContext = useSessionContext();

    if (sessionContext.loading === true) {
        return null;
    }

    console.log("Userr: " + JSON.stringify(sessionContext))
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