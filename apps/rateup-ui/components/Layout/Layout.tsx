import React, {useEffect} from 'react';
import {
    AppShell,
    useMantineTheme,
    Container,
    createStyles
} from '@mantine/core';
import { HeaderTabs } from './Header/Header';
import { IUserInfoApiResponse, fetchUserInfo } from '../../backend/user/user.api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useUser } from '../../context/UserContext';
import LeftNavbar from './Navbar/LeftNavbar';
import { RouteParamsProvider } from '../../context/RouteParamsContext';
import SessionAuth from '../SuperToken/SessionAuth';
import { useRouter } from 'next/router';
import useLocalStorage from '../../hooks/localStorage';

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

    const [userInfo, setUserInfo] = useLocalStorage<IUserInfoApiResponse | null>('userInfo', null);
    const { setUser } = useUser();
    const queryClient = useQueryClient();

    const {
        isLoading: isLoadingUserInfo,
        data: userQueryData,
        error: errorUserInfo,
        refetch,
      } = useQuery<IUserInfoApiResponse>({
        queryKey: ["userInfoQuery"],
        queryFn: fetchUserInfo,
        notifyOnChangeProps: ['data'],
        enabled: !userInfo, // fetch only if there is no data in localStorage
      });

      useEffect(() => {
        console.log("query refetching...")
        if (userQueryData?.data) {
          setUserInfo(userQueryData); // update localStorage
        }
        if(userQueryData?.data?.email && !userQueryData?.data?.orgId){
            if (router.query.msg !== 'welcome') {
                router.push('/signup?auth=google');
            }
        }

        if (!userQueryData) {
            refetch();
          }
      }, [userQueryData]);

      useEffect(() => {
        setUser(userInfo?.data)

        if(userInfo === null ) 
            queryClient.invalidateQueries(["userInfoQuery"]);

      }, [userInfo]);


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
                        <HeaderTabs />
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
