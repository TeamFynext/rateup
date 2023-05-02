import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { LoadingOverlay, Paper, Text } from '@mantine/core';


const Logout = () => {
    const router = useRouter();
    const supabaseClient = useSupabaseClient();


    useEffect(() => {
        const signOut = async () => {
            const { error } = await supabaseClient.auth.signOut();
            if (!error) {
                router.push('/'); // Redirect to the desired page after successful sign out
            } else {
                console.error('Error during sign out:', error.message);
            }
        };

        signOut();
    }, [router]);

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
