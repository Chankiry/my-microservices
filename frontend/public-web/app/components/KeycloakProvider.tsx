'use client';

import { ReactKeycloakProvider } from '@react-keycloak/web';
import Keycloak from 'keycloak-js';

const keycloakConfig = {
  url: process.env.NEXT_PUBLIC_KEYCLOAK_URL || 'http://localhost:8080',
  realm: process.env.NEXT_PUBLIC_KEYCLOAK_REALM || 'master',
  clientId: process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID || 'next-web-client',
};

const keycloak = new Keycloak(keycloakConfig);

const eventLogger = (event: string, error?: Error) => {
  console.log('Keycloak event:', event, error);
};

const tokenLogger = (tokens: { token?: string; refreshToken?: string; idToken?: string }) => {
  console.log('Keycloak tokens updated');
  if (tokens.token) {
    localStorage.setItem('access_token', tokens.token);
  }
  if (tokens.refreshToken) {
    localStorage.setItem('refresh_token', tokens.refreshToken);
  }
};

export function KeycloakProvider({ children }: { children: React.ReactNode }) {
  return (
    <ReactKeycloakProvider
      authClient={keycloak}
      onEvent={eventLogger}
      onTokens={tokenLogger}
      initOptions={{
        onLoad: 'check-sso',
        silentCheckSsoRedirectUri: typeof window !== 'undefined' ? window.location.origin + '/silent-check-sso.html' : undefined,
      }}
    >
      {children}
    </ReactKeycloakProvider>
  );
}

export { keycloak };
