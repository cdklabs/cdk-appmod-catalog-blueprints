import React, { useEffect, useState } from 'react';
import { Amplify } from 'aws-amplify';
import { Authenticator } from '@aws-amplify/ui-react';
import { fetchAuthSession } from 'aws-amplify/auth';
import '@aws-amplify/ui-react/styles.css';
import { config } from '../utils/config';

interface AuthWrapperProps {
  children: (token: string) => React.ReactNode;
}

// Inner component that handles token fetching
const AuthenticatedContent: React.FC<{
  user: any;
  signOut?: () => void;
  children: (token: string) => React.ReactNode;
}> = ({ user, signOut, children }) => {
  const [token, setToken] = useState<string>('');

  useEffect(() => {
    const getToken = async () => {
      try {
        const session = await fetchAuthSession();
        const idToken = session.tokens?.idToken?.toString() || '';
        setToken(idToken);
      } catch (error) {
        console.error('Failed to get auth token:', error);
        setToken('');
      }
    };
    
    if (user) {
      getToken();
    }
  }, [user]);

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#f3f4f6',
    }}>
      {/* Header */}
      <header style={{
        padding: '16px 24px',
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', color: '#1f2937' }}>
            Customer Support Chatbot
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#6b7280' }}>
            Powered by Amazon Bedrock
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '14px', color: '#6b7280' }}>
            {user?.signInDetails?.loginId}
          </span>
          <button
            onClick={signOut}
            style={{
              padding: '8px 16px',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main style={{
        flex: 1,
        padding: '24px',
        overflow: 'hidden',
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          height: '100%',
        }}>
          {token ? children(token) : (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              Loading session...
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export const AuthWrapper: React.FC<AuthWrapperProps> = ({ children }) => {
  useEffect(() => {
    // Configure Amplify (v6 format)
    Amplify.configure({
      Auth: {
        Cognito: {
          userPoolId: config.userPoolId,
          userPoolClientId: config.userPoolClientId,
        },
      },
    });
  }, []);

  return (
    <Authenticator>
      {({ signOut, user }) => (
        <AuthenticatedContent user={user} signOut={signOut}>
          {children}
        </AuthenticatedContent>
      )}
    </Authenticator>
  );
};
