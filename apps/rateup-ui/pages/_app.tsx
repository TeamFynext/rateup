import React, {useState} from 'react';
import {AppProps} from 'next/app';
import Head from 'next/head';
import {MantineProvider} from '@mantine/core';
import {Notifications} from '@mantine/notifications';
import {createBrowserSupabaseClient} from '@supabase/auth-helpers-nextjs';
import {Session, SessionContextProvider} from '@supabase/auth-helpers-react';
import Layout from "../components/Layout/Layout";

export default function App({
                                Component,
                                pageProps,
                                ...appProps
                            }: AppProps<{
    initialSession: Session
}>) {
    const [supabaseClient] = useState(() => createBrowserSupabaseClient());
    console.log("route=", appProps.router.pathname)
    const isLayoutNeeded = appProps.router.pathname.includes("/dashboard")
    const LayoutComponent = isLayoutNeeded ? Layout : React.Fragment;

    return (
        <>
            <Head>
                <title>Rateup</title>
                <meta name="viewport" content="minimum-scale=1, initial-scale=1, width=device-width"/>
                <link rel="shortcut icon" href="/favicon.svg"/>
            </Head>
            <SessionContextProvider
                supabaseClient={supabaseClient}
                initialSession={pageProps.initialSession}
            >
                <MantineProvider withGlobalStyles withNormalizeCSS>
                    <Notifications />
                    <LayoutComponent>
                        <Component {...pageProps} />
                    </LayoutComponent>
                    <Notifications/>
                </MantineProvider>
            </SessionContextProvider>
        </>
    );
}
