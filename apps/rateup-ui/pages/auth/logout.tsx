import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { LoadingOverlay, Paper, Text } from '@mantine/core';
import { signOut } from "supertokens-auth-react/recipe/session";

const Logout = () => {
    const router = useRouter();
    useEffect(() => {
        handleSignOut();
        router.push('/login')
    }, [router]);

    async function handleSignOut() {
        await signOut();
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