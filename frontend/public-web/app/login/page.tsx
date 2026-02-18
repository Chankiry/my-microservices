'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { config } from '@/lib/config';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login, isAuthenticated, isLoading: authLoading, error: authError, clearError } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('returnUrl') || '/dashboard';

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.push(returnUrl);
    }
  }, [authLoading, isAuthenticated, router, returnUrl]);

  // Show auth context errors
  useEffect(() => {
    if (authError) {
      setError(authError);
    }
  }, [authError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    clearError();
    setIsLoading(true);

    try {
      await login(email, password);
      router.push(returnUrl);
    } catch (err: any) {
      setError(err.message || 'Invalid email or password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const fillTestUser = () => {
    setEmail(config.testCredentials.user.email);
    setPassword(config.testCredentials.user.password);
  };

  const fillTestAdmin = () => {
    setEmail(config.testCredentials.admin.email);
    setPassword(config.testCredentials.admin.password);
  };

  if (authLoading || isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="w-full max-w-5xl flex bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Left Side - Branding */}
        <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-blue-600 to-blue-800 p-12 text-white">
          <div className="max-w-md">
            <h1 className="text-4xl font-bold mb-4">Welcome Back</h1>
            <p className="text-blue-100 text-lg mb-8">
              Sign in to access the Microservices Platform and manage your applications.
            </p>
            
            <div className="space-y-4">
              {[
                { icon: '🔐', text: 'Secure Authentication' },
                { icon: '👥', text: 'User Management' },
                { icon: '📊', text: 'Real-time Analytics' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-2xl">{item.icon}</span>
                  <span className="text-blue-100">{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="flex-1 p-8 lg:p-12">
          <div className="max-w-sm mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Sign In</h2>
              <p className="text-gray-500">Enter your credentials to continue</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6 text-sm flex items-start gap-3">
                <svg className="w-5 h-5 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="15" y1="9" x2="9" y2="15"/>
                  <line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
                <div>
                  <p className="font-medium">Login Failed</p>
                  <p className="mt-1 text-red-600">{error}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  disabled={isLoading}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all disabled:bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    disabled={isLoading}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all disabled:bg-gray-50 pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || !email || !password}
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-gray-500">
              Don't have an account?{' '}
              <Link href="/register" className="text-blue-600 font-medium hover:underline">
                Create one
              </Link>
            </div>

            {/* Test Credentials */}
            <div className="mt-8 border border-gray-200 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setShowCredentials(!showCredentials)}
                className="w-full px-4 py-3 bg-gray-50 text-left flex items-center justify-between text-sm font-medium text-gray-600 hover:bg-gray-100"
              >
                Test Credentials (Development Only)
                <svg className={`w-4 h-4 transition-transform ${showCredentials ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </button>
              {showCredentials && (
                <div className="p-4 space-y-2">
                  <button
                    type="button"
                    onClick={fillTestUser}
                    className="w-full flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg text-sm hover:bg-gray-100 text-left"
                  >
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">User</span>
                    user@example.com / Password123!
                  </button>
                  <button
                    type="button"
                    onClick={fillTestAdmin}
                    className="w-full flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg text-sm hover:bg-gray-100 text-left"
                  >
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium">Admin</span>
                    admin@example.com / Admin123!
                  </button>
                  <p className="text-xs text-gray-400 mt-2">
                    Note: These users must be created in Keycloak first.
                  </p>
                </div>
              )}
            </div>

            {/* Keycloak Status Info */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700">
                <strong>Keycloak URL:</strong> {config.keycloak.url}
              </p>
              <p className="text-sm text-blue-700 mt-1">
                <strong>Realm:</strong> {config.keycloak.realm}
              </p>
              <p className="text-sm text-blue-700 mt-1">
                <strong>Client:</strong> {config.keycloak.clientId}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
