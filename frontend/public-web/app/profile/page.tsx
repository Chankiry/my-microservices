'use client';

import { useKeycloak } from '@react-keycloak/web';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const { keycloak, initialized } = useKeycloak();
  const router = useRouter();

  useEffect(() => {
    if (initialized && !keycloak?.authenticated) {
      keycloak?.login();
    }
  }, [initialized, keycloak]);

  if (!initialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse">Initializing...</div>
      </div>
    );
  }

  if (!keycloak?.authenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>Redirecting to login...</div>
      </div>
    );
  }

  const userInfo = keycloak.tokenParsed;

  return (
    <div className="container mx-auto p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Profile</h1>
        
        <div className="bg-white shadow-lg rounded-lg p-6 space-y-4">
          <div className="border-b pb-4">
            <h2 className="text-xl font-semibold mb-4">User Information</h2>
            <div className="space-y-2">
              <div>
                <span className="font-medium text-gray-700">Username:</span>{' '}
                <span className="text-gray-900">{userInfo?.preferred_username || 'N/A'}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Email:</span>{' '}
                <span className="text-gray-900">{userInfo?.email || 'N/A'}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Name:</span>{' '}
                <span className="text-gray-900">{userInfo?.name || 'N/A'}</span>
              </div>
            </div>
          </div>
          
          <div className="pt-4">
            <button
              onClick={() => keycloak.logout({ redirectUri: window.location.origin })}
              className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}