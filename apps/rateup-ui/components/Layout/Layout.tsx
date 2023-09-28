import React, {useEffect, useState} from 'react';
import {
    AppShell,
    useMantineTheme,
    Container,
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

const classes = {
    appShellBody: {
      paddingLeft: '10vw',
      paddingRight: '10vw',
      marginTop: '23vh'
    },
  };

// @ts-ignore
export default ({ children }) => {
    const theme = useMantineTheme();
    const router = useRouter();
    const [opened, setOpened] = useState(false);

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
                // header={{ height: 160 }}
                styles={{
                        main: {
                            // background: theme.colorScheme === 'dark' ? theme.colors.dark[8] : theme.colors.gray[0],
                            background:theme.colors.gray[0],
                            padding:0 ,
                            margin: 0,
                            paddingTop: '10px',
                            marginLeft: opened ? "130px" : 0,
                            transition: "margin-left 0.3s ease-in-out", 
                        },
                    }}
             
                >
                    <AppShell.Navbar >
                        <LeftNavbar opened={opened} setOpened={setOpened}/>
                    </AppShell.Navbar>

                     <AppShell.Header>
                          <HeaderTabs opened={opened}  />
                    </AppShell.Header>

                    <AppShell.Main>
                        <Container style={classes.appShellBody} fluid>
                            {children}
                        </Container>
                    </AppShell.Main>
                    
                    
                </AppShell>
            </RouteParamsProvider>
        </SessionAuth>
    );
};
