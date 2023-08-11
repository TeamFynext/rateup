import { RateupButtonBlue, RateupButtonPrimary, RateupButtonSecondary } from "../../components/Button/RateupButtons";
import { Group, Title, Space, Container} from '@mantine/core';
import {useEffect, useState} from 'react';
import { useRouter } from 'next/router';
import { useQueryClient } from "@tanstack/react-query";
import Loading from "../../components/Page/Loading";
import { useUser } from "../../context/UserContext";

export default function DashboardHome() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { user } = useUser();

    useEffect(() => {
        if (!user?.role) {
            queryClient.invalidateQueries(['userInfoQuery']);
        }
        console.log("Dashboard Role:" + user?.role);
    }, []);

    
    return (
        <>
        <Title order={1}>Dashboard</Title>
        <Space h="xl" />
                        {
                user ?

                <Container fluid>

                    <Group mt="xl" pt="xl">  

                            <RateupButtonBlue onClick={() => router.push('/dashboard/surveys')} title={"Surveys"}  />

                            <RateupButtonPrimary onClick={() => router.push('/dashboard/teams')} title={"Teams"}  />

                            <RateupButtonSecondary onClick={() => router.push('/dashboard/settings')} title={"Settings"}  />

                    </Group>
   

            </Container>

                : <Loading h={300} />
            }

        </>
    );

}