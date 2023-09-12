import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { LoadingOverlay, Paper, Text } from '@mantine/core';
//import { signOut } from "supertokens-auth-react/recipe/session";
import Session from "supertokens-web-js/recipe/session";
import { useQueryClient } from '@tanstack/react-query';

const Logout = () => {
    const router = useRouter();
    const queryClient = useQueryClient();

    useEffect(() => {
        handleSignOut();
        router.push('/login')
    }, [router]);

    async function handleSignOut() {
       if (typeof window !== 'undefined') {
        localStorage.clear();
        queryClient.clear()
        }
       await Session.signOut(); 

        router.push('/login');
    }

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Paper shadow="xs" style={{ maxWidth: '300px', position: 'relative', padding: '20px', textAlign: 'center' }}>
                <div style={{ position: 'relative', height: '40px' }}>
                    <LoadingOverlay visible />
                </div>
                <Text align="center" size="xl" style={{ marginBottom: '10px', marginTop: '10px' }}>
                    Logging out...
                </Text>

            </Paper>
        </div>
    );
};

export default Logout;