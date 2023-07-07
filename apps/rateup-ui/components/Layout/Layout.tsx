import React, {useEffect} from 'react';
import {
    AppShell,
    useMantineTheme,
    Container,
    createStyles
} from '@mantine/core';
import { HeaderTabs } from './Header/Header';
import { fetchUserInfo } from '../../backend/user/user.api';
import { useQuery } from '@tanstack/react-query';
import { useUser } from '../../context/UserContext';
import LeftNavbar from './Navbar/LeftNavbar';
import { RouteParamsProvider } from '../../context/RouteParamsContext';
import SessionAuth from '../SuperToken/SessionAuth';
import { useRouter } from 'next/router';

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
    const router = useRouter();

     const {
        isLoading: isLoadingUserInfo,
        data: userInfo,
        error: errorUserInfo,
        refetch,
        } = useQuery<UserInfoQueryData>(["userInfoQuery"], fetchUserInfo, {
        refetchOnWindowFocus: "always",
        refetchOnMount: "always",
    })
    const { setUser } = useUser();

      useEffect(() => {
        console.log("Query Fetched UserInfo:"+ JSON.stringify(userInfo?.data?.data))
        !userInfo?.data?.data && refetch()
        setUser(userInfo?.data?.data)

        if(userInfo?.data?.data?.email && !userInfo?.data?.data?.orgId){
            if (router.query.msg !== 'welcome') {
                router.push('/signup?auth=google');
            }
        }
      }, [userInfo])

    return (
        <SessionAuth>
            <RouteParamsProvider>
                <AppShell
                styles={{
                        main: {
                            background: theme.colorScheme === 'dark' ? theme.colors.dark[8] : theme.colors.gray[0],
                        },
                    }}

                navbar={<LeftNavbar />}
                header={
                        <HeaderTabs userData={userInfo?.data?.data}/>
                    }
                >
                    <Container className={classes.appShellBody} fluid>
                        {children}
                    </Container>
                    
                </AppShell>
            </RouteParamsProvider>
        </SessionAuth>
    );
};
