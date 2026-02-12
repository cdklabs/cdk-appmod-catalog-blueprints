import { Config } from '../types';

/**
 * Load configuration from environment variables
 *
 * These values are set during the build process from CloudFormation outputs
 */
export const config: Config = {
  chatApiEndpoint: process.env.REACT_APP_CHAT_API_ENDPOINT || 'http://localhost:8080/chat',
  userPoolId: process.env.REACT_APP_USER_POOL_ID || '',
  userPoolClientId: process.env.REACT_APP_USER_POOL_CLIENT_ID || '',
  region: process.env.REACT_APP_REGION || 'us-east-1',
};

/**
 * Validate configuration
 */
export function validateConfig(): void {
  const missing: string[] = [];

  if (!config.chatApiEndpoint) missing.push('REACT_APP_CHAT_API_ENDPOINT');
  if (!config.userPoolId) missing.push('REACT_APP_USER_POOL_ID');
  if (!config.userPoolClientId) missing.push('REACT_APP_USER_POOL_CLIENT_ID');
  if (!config.region) missing.push('REACT_APP_REGION');

  if (missing.length > 0) {
    console.warn(
      'Missing configuration:',
      missing.join(', '),
      '\nUsing default values for development.'
    );
  }
}
