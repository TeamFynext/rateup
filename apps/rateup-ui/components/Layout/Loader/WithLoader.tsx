import React from 'react'
import { useEffect, useState, ReactNode } from 'react';
import Router from 'next/router';
import { LoadingOverlay, Text, Stack } from '@mantine/core';


interface WithLoaderProps {
    children: ReactNode;
  }
  
const WithLoader: React.FC<WithLoaderProps> = ({ children }) => {

    
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const start = () => setLoading(true);
    const end = () => setLoading(false);

    Router.events.on('routeChangeStart', start);
    Router.events.on('routeChangeComplete', end);
    Router.events.on('routeChangeError', end);

    return () => {
      Router.events.off('routeChangeStart', start);
      Router.events.off('routeChangeComplete', end);
      Router.events.off('routeChangeError', end);
    };
  }, []);


  if (loading) {
    return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Stack>
        <LoadingOverlay visible />
      </Stack>
      {/* <Text>Loading...</Text> */}
</div>
  }

  return <>{children}</>;
}

export default WithLoader