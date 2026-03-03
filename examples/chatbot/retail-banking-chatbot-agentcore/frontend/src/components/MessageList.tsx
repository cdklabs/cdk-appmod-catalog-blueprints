import React, { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Message } from '../types';

interface MessageListProps {
  messages: Message[];
}

export const MessageList: React.FC<MessageListProps> = ({ messages }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div style={{
      flex: 1,
      overflowY: 'auto',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
    }}>
      {messages.length === 0 && (
        <div style={{
          textAlign: 'center',
          color: '#9ca3af',
          marginTop: '40px',
        }}>
          <p style={{ fontSize: '18px', marginBottom: '8px' }}>
            👋 Welcome to Customer Support
          </p>
          <p style={{ fontSize: '14px' }}>
            How can I help you today?
          </p>
        </div>
      )}
      
      {messages.map((message) => (
        <div
          key={message.id}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: message.role === 'user' ? 'flex-end' : 'flex-start',
          }}
        >
          <div
            style={{
              maxWidth: '70%',
              padding: '12px 16px',
              borderRadius: '12px',
              backgroundColor: message.role === 'user' ? '#3b82f6' : '#f3f4f6',
              color: message.role === 'user' ? 'white' : '#1f2937',
              wordWrap: 'break-word',
              opacity: message.status === 'sending' ? 0.7 : 1,
              borderLeft: message.status === 'streaming' ? '3px solid #3b82f6' : 'none',
            }}
          >
            <div>
              {message.role === 'user' ? (
                <span style={{ whiteSpace: 'pre-wrap' }}>{message.content}</span>
              ) : (
                <div className="markdown-body"><ReactMarkdown>{message.content}</ReactMarkdown></div>
              )}
            </div>
            {message.status === 'error' && (
              <div style={{
                marginTop: '4px',
                fontSize: '12px',
                color: '#ef4444',
              }}>
                Failed to send
              </div>
            )}
          </div>
          <div style={{
            fontSize: '12px',
            color: '#9ca3af',
            marginTop: '4px',
            paddingLeft: message.role === 'user' ? '0' : '8px',
            paddingRight: message.role === 'user' ? '8px' : '0',
          }}>
            {formatTime(message.timestamp)}
          </div>
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
};
