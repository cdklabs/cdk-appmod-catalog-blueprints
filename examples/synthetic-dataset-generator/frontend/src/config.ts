/**
 * Application configuration from environment variables.
 * These are injected at build time by Vite.
 */
export const config = {
  // API endpoint for InteractiveAgent (from CDK output: ChatApiEndpoint)
  apiEndpoint: import.meta.env.VITE_API_ENDPOINT || '',

  // Cognito User Pool ID (from CDK output: UserPoolId)
  userPoolId: import.meta.env.VITE_USER_POOL_ID || '',

  // Cognito User Pool Client ID (from CDK output: UserPoolClientId)
  userPoolClientId: import.meta.env.VITE_USER_POOL_CLIENT_ID || '',

  // AWS Region (defaults to us-east-1)
  region: import.meta.env.VITE_AWS_REGION || 'us-east-1',
};

// Validate required configuration in development
if (import.meta.env.DEV) {
  const missing: string[] = [];
  if (!config.apiEndpoint) missing.push('VITE_API_ENDPOINT');
  if (!config.userPoolId) missing.push('VITE_USER_POOL_ID');
  if (!config.userPoolClientId) missing.push('VITE_USER_POOL_CLIENT_ID');

  if (missing.length > 0) {
    console.warn(
      `Missing environment variables: ${missing.join(', ')}. ` +
      'Copy .env.example to .env and fill in values from CDK outputs.'
    );
  }
}
