import { useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/router';
import Session from 'supertokens-web-js/recipe/session';
import { LoadingOverlay , Text, Paper } from '@mantine/core';

interface SessionAuthProps {
  children: ReactNode;
}

const SessionAuth: React.FC<SessionAuthProps> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const sessionExists = await Session.doesSessionExist();
      if (!sessionExists) {
        router.push('/login');
      }
      setLoading(false);
    };

    checkSession();
  }, [router]);

  if (loading) {
    return         <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
   <LoadingOverlay visible /> 
   <Text pt="5rem">Loading...</Text>
</div>
  }

  return <>{children}</>;
};

export default SessionAuth;
