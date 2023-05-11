import React, { useEffect } from 'react';
import {AppProps} from 'next/app';
import Head from 'next/head';
import {MantineProvider} from '@mantine/core';
import {Notifications} from '@mantine/notifications';
import Layout from "../components/Layout/Layout";
import SuperTokensReact, {redirectToAuth, SuperTokensWrapper} from 'supertokens-auth-react';
import {frontendConfig} from '../config/frontendConfig';
import Session from 'supertokens-auth-react/recipe/session'

if (typeof window !== 'undefined') {
    SuperTokensReact.init(frontendConfig());
}
export default function App({Component, pageProps, ...appProps}: AppProps) {

    console.log("route=", appProps.router.pathname);
    const isLayoutNeeded = appProps.router.pathname.includes("/dashboard");
    const LayoutComponent = isLayoutNeeded ? Layout : React.Fragment;

    useEffect(() => {
        async function doRefresh() {
            if (pageProps.fromSupertokens === 'needs-refresh') {
                if (await Session.attemptRefreshingSession()) {
                    location.reload()
                } else {
                    // user has been logged out
                    redirectToAuth()
                }
            }
        }

        doRefresh()
    }, [pageProps.fromSupertokens])
    if (pageProps.fromSupertokens === 'needs-refresh') {
        return null
    }

    return (
        <>
            <Head>
                <title>Rateup</title>
                <meta name="viewport" content="minimum-scale=1, initial-scale=1, width=device-width"/>
                <link rel="shortcut icon" href="/favicon.svg"/>
            </Head>
            <SuperTokensWrapper>
                <MantineProvider withGlobalStyles withNormalizeCSS>
                    <Notifications/>
                    <LayoutComponent>
                        <Component {...pageProps} />
                    </LayoutComponent>
                    <Notifications/>
                </MantineProvider>
            </SuperTokensWrapper>
        </>
    );
}
