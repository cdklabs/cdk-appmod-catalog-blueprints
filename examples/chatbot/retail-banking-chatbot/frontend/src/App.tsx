import React from 'react';
import { ChatInterface } from './components/ChatInterface';
import { config, validateConfig } from './utils/config';

const SKIP_AUTH = false;

function App() {
  React.useEffect(() => {
    validateConfig();
  }, []);

  const header = (subtitle?: string) => (
    <header style={{
      padding: '16px 24px',
      background: 'linear-gradient(135deg, #1a365d 0%, #2a4a7f 100%)',
      borderBottom: '3px solid #c9a84c',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    }}>
      <div>
        <h1 style={{ margin: 0, fontSize: '22px', color: '#ffffff', fontWeight: 600 }}>
          🏦 AWSome Bank
        </h1>
        <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#c9a84c' }}>
          {subtitle || 'Retail Banking Assistant'}
        </p>
      </div>
    </header>
  );

  if (SKIP_AUTH) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#f0f2f5',
      }}>
        {header('⚠️ Development Mode')}
        <main style={{ flex: 1, padding: '24px', overflow: 'hidden' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', height: '100%' }}>
            <ChatInterface
              chatApiEndpoint={config.chatApiEndpoint}
              token="mock-token-for-dev"
            />
          </div>
        </main>
      </div>
    );
  }

  const { AuthWrapper } = require('./components/AuthWrapper');
  return (
    <AuthWrapper>
      {(token: string) => (
        <div style={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#f0f2f5',
        }}>
          {header()}
          <main style={{ flex: 1, padding: '24px', overflow: 'hidden' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto', height: '100%' }}>
              <ChatInterface
                chatApiEndpoint={config.chatApiEndpoint}
                token={token}
              />
            </div>
          </main>
        </div>
      )}
    </AuthWrapper>
  );
}

export default App;
