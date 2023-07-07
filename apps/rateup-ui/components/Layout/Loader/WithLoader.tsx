import React from 'react'
import { useEffect, useState, ReactNode } from 'react';
import Router from 'next/router';
import { LoadingOverlay , Text } from '@mantine/core';


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
    return         <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
   <LoadingOverlay visible /> 
   <Text pt="5rem">Loading...</Text>
</div>
  }

  return <>{children}</>;
}

export default WithLoader