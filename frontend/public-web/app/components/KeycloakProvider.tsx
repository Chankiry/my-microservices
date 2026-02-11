'use client';

import { ReactKeycloakProvider } from '@react-keycloak/web';
import type { AuthClientEvent, AuthClientError } from '@react-keycloak/core';
import { ReactNode, useState, useEffect } from 'react';
import { getKeycloakInstance } from '@/lib/keycloak';

const eventLogger = (event: AuthClientEvent, error?: AuthClientError) => {
  console.log('Keycloak event:', event, error);
};

const tokenLogger = (tokens: { token?: string; refreshToken?: string; idToken?: string }) => {
  console.log('Keycloak tokens updated');
  
  if (typeof window !== 'undefined') {
    if (tokens.token) {
      localStorage.setItem('access_token', tokens.token);
    }
    if (tokens.refreshToken) {
      localStorage.setItem('refresh_token', tokens.refreshToken);
    }
    if (tokens.idToken) {
      localStorage.setItem('id_token', tokens.idToken);
    }
  }
};

export function KeycloakProvider({ children }: { children: ReactNode }) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Only render on client side
  if (!isClient) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-lg">Loading...</div>
      </div>
    );
  }

  const keycloak = getKeycloakInstance();

  return (
    <ReactKeycloakProvider
      authClient={keycloak}
      onEvent={eventLogger}
      onTokens={tokenLogger}
      initOptions={{
        onLoad: 'check-sso',
        checkLoginIframe: false,
        silentCheckSsoRedirectUri: `${window.location.origin}/silent-check-sso.html`,
        pkceMethod: 'S256',
      }}
      LoadingComponent={
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-pulse text-lg">Authenticating...</div>
        </div>
      }
    >
      {children}
    </ReactKeycloakProvider>
  );
}

export const keycloak = typeof window !== 'undefined' ? getKeycloakInstance() : null;