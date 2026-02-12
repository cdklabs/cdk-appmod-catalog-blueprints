import React from 'react';
import { ChatStatus } from '../types';

interface ConnectionStatusProps {
  status: ChatStatus;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ status }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'idle':
        return '#10b981'; // green
      case 'sending':
        return '#f59e0b'; // amber
      case 'error':
        return '#ef4444'; // red
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'idle':
        return 'Ready';
      case 'sending':
        return 'Responding...';
      case 'error':
        return 'Error';
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 16px',
      backgroundColor: '#f3f4f6',
      borderRadius: '8px',
    }}>
      <div style={{
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        backgroundColor: getStatusColor(),
      }} />
      <span style={{ fontSize: '14px', color: '#374151' }}>
        {getStatusText()}
      </span>
    </div>
  );
};
