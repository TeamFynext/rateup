import { useState } from 'react';
import { AppProps } from 'next/app';
import Head from 'next/head';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { createBrowserSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { Session, SessionContextProvider } from '@supabase/auth-helpers-react';

export default function App({
                                Component,
                                pageProps,
                            }: AppProps<{
    initialSession: Session
}>) {
    const [supabaseClient] = useState(() => createBrowserSupabaseClient());

    return (
        <>
            <Head>
                <title>Mantine next example</title>
                <meta name="viewport" content="minimum-scale=1, initial-scale=1, width=device-width" />
                <link rel="shortcut icon" href="/favicon.svg" />
            </Head>
            <SessionContextProvider
              supabaseClient={supabaseClient}
              initialSession={pageProps.initialSession}
            >

                <MantineProvider withGlobalStyles withNormalizeCSS>
                    <Component {...pageProps} />
                    <Notifications />
                </MantineProvider>
            </SessionContextProvider>
        </>
    );
}
