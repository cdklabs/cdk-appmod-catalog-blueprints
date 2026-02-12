import React from 'react';
import { ChatInterface } from './components/ChatInterface';
import { config, validateConfig } from './utils/config';

/**
 * SKIP_AUTH flag for development/testing
 *
 * Set to true to bypass Cognito authentication for quick UI testing.
 * Set to false (default) for production deployment with full authentication.
 *
 * WARNING: Only use SKIP_AUTH=true for local development. Never deploy to
 * production with authentication disabled.
 */
const SKIP_AUTH = false;

function App() {
  // Validate configuration on mount
  React.useEffect(() => {
    validateConfig();
  }, []);

  if (SKIP_AUTH) {
    // Development mode - bypass authentication for quick testing
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
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#ff6b6b' }}>
              ⚠️ Development Mode - Authentication Disabled
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontSize: '14px', color: '#6b7280' }}>
              dev@example.com
            </span>
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
            <ChatInterface
              chatApiEndpoint={config.chatApiEndpoint}
              token="mock-token-for-dev"
            />
          </div>
        </main>
      </div>
    );
  }

  // Production mode - use Amplify authentication
  const { AuthWrapper } = require('./components/AuthWrapper');
  return (
    <AuthWrapper>
      {(token: string) => (
        <ChatInterface
          chatApiEndpoint={config.chatApiEndpoint}
          token={token}
        />
      )}
    </AuthWrapper>
  );
}

export default App;
