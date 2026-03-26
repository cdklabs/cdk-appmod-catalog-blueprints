import { useEffect, useState } from 'react';
import { Amplify } from 'aws-amplify';
import { Authenticator, ThemeProvider, Theme } from '@aws-amplify/ui-react';
import { fetchAuthSession } from 'aws-amplify/auth';
import '@aws-amplify/ui-react/styles.css';
import { ChatProvider } from './context/ChatContext';
import { ChatPanel } from './components/chat/ChatPanel';
import { SchemaPanel } from './components/data/SchemaPanel';
import { PreviewPanel } from './components/data/PreviewPanel';
import { Layout } from './components/layout/Layout';
import { config } from './config';
import { initializeAPI } from './services/api';
import { Loader2 } from 'lucide-react';

// Configure Amplify on app load
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: config.userPoolId,
      userPoolClientId: config.userPoolClientId,
      loginWith: {
        username: true,
        email: true,
        phone: false,
      },
    },
  },
});

// Dark theme for Amplify UI
const darkTheme: Theme = {
  name: 'datasynth-dark',
  tokens: {
    colors: {
      background: {
        primary: { value: '#0f172a' },    // slate-900
        secondary: { value: '#1e293b' },  // slate-800
      },
      font: {
        primary: { value: '#f8fafc' },    // slate-50
        secondary: { value: '#94a3b8' },  // slate-400
        interactive: { value: '#38bdf8' }, // sky-400
      },
      brand: {
        primary: {
          10: { value: '#0c4a6e' },
          20: { value: '#075985' },
          40: { value: '#0369a1' },
          60: { value: '#0284c7' },
          80: { value: '#0ea5e9' },
          90: { value: '#38bdf8' },
          100: { value: '#7dd3fc' },
        },
      },
      border: {
        primary: { value: '#334155' },    // slate-700
        secondary: { value: '#475569' },  // slate-600
      },
    },
  },
};

/**
 * Loading screen.
 */
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
    </div>
  );
}

/**
 * Authenticated content - main app after login.
 */
function AuthenticatedContent({ user, signOut }: { user: any; signOut?: () => void }) {
  const [isReady, setIsReady] = useState(false);

  // Get user ID (Cognito sub) for session persistence
  const userId = user?.userId || user?.username || 'anonymous';

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Initialize API with token getter
        initializeAPI({
          apiEndpoint: config.apiEndpoint,
          getAuthToken: async () => {
            const session = await fetchAuthSession();
            return session.tokens?.idToken?.toString() || '';
          },
        });
        setIsReady(true);
      } catch (error) {
        console.error('Failed to initialize:', error);
      }
    };

    initAuth();
  }, []);

  if (!isReady) {
    return <LoadingScreen />;
  }

  return (
    <ChatProvider userId={userId}>
      <Layout
        chatPanel={<ChatPanel />}
        schemaPanel={<SchemaPanel />}
        previewPanel={<PreviewPanel />}
        user={user?.signInDetails?.loginId || user?.username}
        onSignOut={signOut}
      />
    </ChatProvider>
  );
}

function App() {
  return (
    <ThemeProvider theme={darkTheme}>
      <div className="min-h-screen bg-slate-900">
        <Authenticator
          components={{
            Header: () => (
              <div className="text-center py-6">
                <h1 className="text-2xl font-bold text-white">DataSynth</h1>
                <p className="text-slate-400 mt-1">AI-Powered Synthetic Data Generator</p>
              </div>
            ),
          }}
        >
          {({ signOut, user }) => (
            <AuthenticatedContent user={user} signOut={signOut} />
          )}
        </Authenticator>
      </div>
    </ThemeProvider>
  );
}

export default App;
