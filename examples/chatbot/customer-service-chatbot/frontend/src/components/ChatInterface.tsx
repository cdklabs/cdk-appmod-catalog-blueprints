import React from 'react';
import { useChat } from '../hooks/useChat';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { ConnectionStatus } from './ConnectionStatus';

interface ChatInterfaceProps {
  chatApiEndpoint: string;
  token: string;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ chatApiEndpoint, token }) => {
  const { chatStatus, messages, sendMessage, error } = useChat(chatApiEndpoint, token);

  const isDisabled = chatStatus === 'sending';

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: 'white',
      borderRadius: '12px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid #e5e7eb',
        backgroundColor: '#f9fafb',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '18px', color: '#1f2937' }}>
            Customer Support
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#6b7280' }}>
            We're here to help
          </p>
        </div>
        <ConnectionStatus status={chatStatus} />
      </div>

      {/* Error Banner */}
      {error && (
        <div style={{
          padding: '12px 20px',
          backgroundColor: '#fef2f2',
          borderBottom: '1px solid #fecaca',
          color: '#991b1b',
          fontSize: '14px',
        }}>
          {error}
        </div>
      )}

      {/* Messages */}
      <MessageList messages={messages} />

      {/* Input */}
      <MessageInput onSend={sendMessage} disabled={isDisabled} />
    </div>
  );
};
