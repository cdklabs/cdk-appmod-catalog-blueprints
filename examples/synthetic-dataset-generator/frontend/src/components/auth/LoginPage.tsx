/**
 * Login page component for Cognito authentication.
 */

import { useState, FormEvent } from 'react';
import { Loader2, Database, AlertCircle } from 'lucide-react';

interface LoginPageProps {
  onLogin: (username: string, password: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export function LoginPage({ onLogin, isLoading, error }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!username.trim() || !password.trim()) {
      setLocalError('Please enter both username and password');
      return;
    }

    try {
      await onLogin(username, password);
    } catch {
      // Error is handled by the parent via the error prop
    }
  };

  const displayError = error || localError;

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-sky-500/10 mb-4">
            <Database className="w-8 h-8 text-sky-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">DataSynth</h1>
          <p className="text-slate-400 mt-2">AI-Powered Synthetic Data Generator</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="bg-slate-800 rounded-xl p-6 shadow-xl border border-slate-700">
          <h2 className="text-lg font-semibold text-white mb-6">Sign in to your account</h2>

          {/* Error Message */}
          {displayError && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{displayError}</p>
            </div>
          )}

          {/* Username */}
          <div className="mb-4">
            <label htmlFor="username" className="block text-sm font-medium text-slate-300 mb-2">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-colors"
              placeholder="Enter your username"
              disabled={isLoading}
              autoComplete="username"
            />
          </div>

          {/* Password */}
          <div className="mb-6">
            <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-colors"
              placeholder="Enter your password"
              disabled={isLoading}
              autoComplete="current-password"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-sky-500 hover:bg-sky-600 disabled:bg-sky-500/50 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign in'
            )}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-slate-500 text-sm mt-6">
          Powered by AWS Cognito
        </p>
      </div>
    </div>
  );
}
