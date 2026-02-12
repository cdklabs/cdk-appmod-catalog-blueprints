import React, { useState, KeyboardEvent } from 'react';

interface MessageInputProps {
  onSend: (message: string) => void;
  disabled: boolean;
}

export const MessageInput: React.FC<MessageInputProps> = ({ onSend, disabled }) => {
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (input.trim() && !disabled) {
      onSend(input);
      setInput('');
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={{
      padding: '16px',
      borderTop: '1px solid #e5e7eb',
      backgroundColor: 'white',
    }}>
      <div style={{
        display: 'flex',
        gap: '12px',
        alignItems: 'flex-end',
      }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={disabled ? 'Connecting...' : 'Type your message...'}
          disabled={disabled}
          rows={1}
          style={{
            flex: 1,
            padding: '12px',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            fontSize: '14px',
            resize: 'none',
            fontFamily: 'inherit',
            minHeight: '44px',
            maxHeight: '120px',
          }}
        />
        <button
          onClick={handleSend}
          disabled={disabled || !input.trim()}
          style={{
            padding: '12px 24px',
            backgroundColor: disabled || !input.trim() ? '#d1d5db' : '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: disabled || !input.trim() ? 'not-allowed' : 'pointer',
            minWidth: '80px',
          }}
        >
          Send
        </button>
      </div>
      <div style={{
        marginTop: '8px',
        fontSize: '12px',
        color: '#9ca3af',
      }}>
        Press Enter to send, Shift+Enter for new line
      </div>
    </div>
  );
};
