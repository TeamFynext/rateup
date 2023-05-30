import React, {useEffect} from 'react';
import {
    AppShell,
    useMantineTheme,
    Container,
    createStyles
} from '@mantine/core';
import { SessionAuth } from "supertokens-auth-react/recipe/session";
import { HeaderTabs } from './Header/Header';
import { fetchUserInfo } from '../../api/user/user.api';
import { useQuery } from '@tanstack/react-query';

const useStyles = createStyles((theme) => ({
  
    appShellBody: {
      paddingLeft:"10vw",
      paddingRight:"10vw"
    },

}));


// @ts-ignore
export default ({ children }) => {
    const theme = useMantineTheme();
    const { classes } = useStyles();

     const {
        isLoading: isLoadingUserInfo,
        data: userInfo,
        error: errorUserInfo,
        refetch,
        } = useQuery<UserInfoQueryData>(["userInfoQuery"], fetchUserInfo, {
        refetchOnWindowFocus: "always",
        refetchOnMount: "always",
    })

      useEffect(() => {
        console.log("Layout userinfo:"+ JSON.stringify(userInfo?.data?.data))
        !userInfo?.data?.data && refetch()
      }, [userInfo])

    return (
        <SessionAuth>
        <AppShell
          styles={{
                main: {
                    background: theme.colorScheme === 'dark' ? theme.colors.dark[8] : theme.colors.gray[0],
                },
            }}

          header={
                <HeaderTabs userData={userInfo?.data?.data}/>
            }
        >
            <Container className={classes.appShellBody} fluid>
                {children}
            </Container>
            
        </AppShell>
        </SessionAuth>
    );
};
