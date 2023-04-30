import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { useUser, useSupabaseClient } from '@supabase/auth-helpers-react';
import { useEffect, useState } from 'react';
import { Button, Card, Flex, Text } from '@mantine/core';
import {useRouter} from "next/router";

const LoginPage = () => {
    const supabaseClient = useSupabaseClient();
    const user = useUser();
    const [data, setData] = useState();
    const router= useRouter();
    const viewType= router.query?.type;
    console.log('Viewtype', viewType)


    useEffect(() => {
        async function loadData() {
            const { data } = await supabaseClient.from('test').select('*');
            setData(data);
        }

// Only run query once user is logged in.
        if (user) loadData();
    }, [user]);

    if (!user) {
        return (
            <Card
              shadow="sm"
              padding="lg"
              radius="md"
              withBorder
              sx={{ maxWidth: '25rem', margin: 'auto', marginTop: '2rem' }}
            >
                <Auth
                  redirectTo="http://localhost:3000/"
                  appearance={{ theme: ThemeSupa }}
                  supabaseClient={supabaseClient}
                  providers={['google']}
                  socialLayout="horizontal"
                  view={viewType}
                />
            </Card>
        );
    }

    return (
        <Card
          shadow="sm"
          padding="lg"
          radius="md"
          withBorder
          sx={{ maxWidth: '25rem', margin: 'auto', marginTop: '2rem' }}
        >
            <Flex
              mih={50}
              gap="md"
              justify="center"
              align="center"
              direction="column"
              wrap="wrap"
            >
                <Text
                  variant="gradient"
                  gradient={{ from: 'indigo', to: 'cyan', deg: 45 }}
                  sx={{ fontFamily: 'Greycliff CF, sans-serif' }}
                  ta="center"
                  fz="xl"
                  fw={700}
                >
                    You are Logged In
                </Text>
                <Button onClick={() => supabaseClient.auth.signOut()}>Sign out</Button>
            </Flex>

        </Card>
    );
};

export default LoginPage;
